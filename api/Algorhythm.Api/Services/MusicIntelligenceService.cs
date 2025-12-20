using Algorhythm.Api.Models;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using System.Net.Http.Json;
using System.Text.Json;

namespace Algorhythm.Api.Services;

public class MusicIntelligenceService
{
    private readonly IChatCompletionService _chatCompletionService;
    private readonly Kernel _kernel;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _geminiApiKey;
    private readonly string _lastFmApiKey;
    private readonly ISpotifyService _spotifyService;

    public MusicIntelligenceService(
        Kernel kernel, 
        IChatCompletionService chatCompletionService, 
        IHttpClientFactory httpClientFactory, 
        IConfiguration configuration,
        ISpotifyService spotifyService)
    {
        _kernel = kernel;
        _chatCompletionService = chatCompletionService;
        _httpClientFactory = httpClientFactory;
        _lastFmApiKey = configuration["LastFm:ApiKey"] ?? "";
        _geminiApiKey = configuration["Gemini:ApiKey"] ?? "";
        _spotifyService = spotifyService;
    }

    private async Task<string> CallGeminiDirectAsync(string prompt, bool expectJson)
    {
        if (string.IsNullOrEmpty(_geminiApiKey)) return "Error: Missing API Key";

        // Upgrading to the latest 2.5 Flash model as requested
        var modelId = "gemini-2.5-flash"; 
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent?key={_geminiApiKey}";
        
        var requestBody = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } }
            }
        };

        var client = _httpClientFactory.CreateClient();
        var response = await client.PostAsJsonAsync(url, requestBody);
        
        if (!response.IsSuccessStatusCode)
        {
             var error = await response.Content.ReadAsStringAsync();
             
             // DIAGNOSTIC CORE: If 404 (Model Not Found), ask the API what IS found.
             if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
             {
                 try 
                 {
                     var listUrl = $"https://generativelanguage.googleapis.com/v1beta/models?key={_geminiApiKey}";
                     var listResponse = await client.GetFromJsonAsync<JsonElement>(listUrl);
                     
                     // Roughly parse the JSON to get "name" fields
                     // Response format: { "models": [ { "name": "models/gemini-pro", ... } ] }
                     var availableModels = "No models found in list.";
                     
                     if (listResponse.TryGetProperty("models", out var modelsElement))
                     {
                         var names = modelsElement.EnumerateArray()
                                        .Select(m => m.GetProperty("name").GetString())
                                        .Where(n => n != null && n.Contains("gemini"))
                                        .Take(5) // Just take 5 relevant ones
                                        .ToList();
                         
                         if (names.Any())
                         {
                             availableModels = string.Join(", ", names);
                         }
                     }
                     
                     throw new Exception($"404. Your API Key sees these models: {availableModels}");
                 }
                 catch (Exception listEx)
                 {
                     // If listing fails too, just return original error
                     throw new Exception($"Gemini 404 (and ListModels failed: {listEx.Message}): {error}");
                 }
             }

             throw new Exception($"Gemini HTTP {response.StatusCode}: {error}");
        }

        var json = await response.Content.ReadFromJsonAsync<GeminiResponse>();
        return json?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text ?? "";
    }

    public async Task<List<ArtistNode>> GetRecommendationsAsync(string seedArtist, float targetValence, float targetEnergy, bool obscure, int quantity, bool eraMatch, bool enableAI)
    {
        // 1. Fetch similar artists from Last.fm (Name + ImageUrl)
        var candidates = await FetchSimilarArtistsWithImagesAsync(seedArtist);

        // 2. Real Spotify feature enrichment
        var enriched = await EnrichWithAudioFeaturesAsync(candidates);

        // 3. Filter with Gemini
        if (enableAI)
        {
            return await FilterWithGeminiAsync(enriched, targetValence, targetEnergy, obscure, quantity, eraMatch);
        }
        else
        {
            // Just take top N and return
            return enriched.Take(quantity).ToList();
        }
    }

    private async Task<List<ArtistNode>> EnrichWithAudioFeaturesAsync(List<(string Name, string ImageUrl)> artists)
    {
        var nodes = new System.Collections.Concurrent.ConcurrentBag<ArtistNode>();
        var sem = new SemaphoreSlim(5); // Concurrency limit
        var tasks = artists.Take(20).Select(async artist => 
        {
            await sem.WaitAsync();
            try
            {
                float valence = 0.5f;
                float energy = 0.5f;
                string finalImage = artist.ImageUrl;

                try
                {
                    // 1. Search (Cache this typically, but for now direct)
                    var spotifyArtist = await _spotifyService.SearchArtistAsync(artist.Name);
                    
                    if (spotifyArtist != null)
                    {
                        // Upgrade Image
                        if (spotifyArtist.Images != null && spotifyArtist.Images.Any())
                        {
                            finalImage = spotifyArtist.Images.First().Url;
                        }

                        // 2. Audio Features
                        var topTracks = await _spotifyService.GetTopTracksAsync(spotifyArtist.Id);
                        if (topTracks.Any())
                        {
                            var featureIds = topTracks.Take(3).Select(t => t.Id);
                            var features = await _spotifyService.GetAudioFeaturesForTracksAsync(featureIds);
                            
                            if (features.Any())
                            {
                                valence = features.Average(f => f.Valence);
                                energy = features.Average(f => f.Energy);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error enriching {artist.Name}: {ex.Message}");
                }

                nodes.Add(new ArtistNode(
                    id: artist.Name, // Use Name as ID for deduplication
                    name: artist.Name,
                    imageUrl: !string.IsNullOrEmpty(finalImage) ? finalImage : $"https://placehold.co/200x200?text={Uri.EscapeDataString(artist.Name)}",
                    isFavorited: false,
                    tags: new List<string> { "Artist" }, 
                    era: "2020s",
                    audioFeatures: new AudioFeatures(valence, energy)
                ));
            }
            finally
            {
                sem.Release();
            }
        });

        await Task.WhenAll(tasks);
        return nodes.ToList();
    }

    public async Task<List<TrackDto>> GetTopTracksAsync(string artist)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            // iTunes Search API: entity=song, limit=5
            var url = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(artist)}&entity=song&limit=5";
            var response = await client.GetFromJsonAsync<ITunesSearchResponse>(url);

            return response?.Results?.Select(t => new TrackDto(
                t.TrackName, 
                "Popular", // iTunes doesn't expose playcounts publicly
                TimeSpan.FromMilliseconds(t.TrackTimeMillis).ToString(@"m\:ss"),
                t.PreviewUrl
            )).ToList() ?? new List<TrackDto>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"iTunes Error: {ex.Message}");
            return new List<TrackDto>();
        }
    }

    private class ITunesSearchResponse { public List<ITunesTrack>? Results { get; set; } }
    private class ITunesTrack 
    { 
        public string TrackName { get; set; } = ""; 
        public long TrackTimeMillis { get; set; }
        public string PreviewUrl { get; set; } = "";
    }

    private async Task<List<ArtistNode>> FilterWithGeminiAsync(List<ArtistNode> candidates, float valence, float energy, bool obscure, int quantity, bool eraMatch)
    {
        var prompt = $@"
        You are a music expert API. 
        Analyze these artists and select the best matches for this vibe:
        Target Valence (0.0 sad/dark -> 1.0 happy/positive): {valence}
        Target Energy (0.0 calm -> 1.0 intense): {energy}
        Obscurity Preferred: {obscure}
        Era Match: {eraMatch}
        
        Candidates (JSON format):
        {System.Text.Json.JsonSerializer.Serialize(candidates.Select(c => new { c.Id, c.AudioFeatures.Valence, c.AudioFeatures.Energy, c.Era }))}

        INSTRUCTIONS:
        1. Select EXACTLY {quantity} artists that best match the criteria.
        2. Return ONLY a raw JSON array of strings, where each string is the exact 'Id' from the candidates.
        3. Do NOT include markdown formatting (like ```json).
        4. If you can't find enough perfect matches, pick the closest ones.
        ";

        try 
        {
            var responseText = await CallGeminiDirectAsync(prompt, true);
            responseText = responseText.Trim();

            // Clean Markdown if present
            if (responseText.StartsWith("```"))
            {
                var lines = responseText.Split('\n').ToList();
                if (lines.Count > 2)
                {
                    // Remove first and last line
                    responseText = string.Join("\n", lines.Skip(1).Take(lines.Count - 2));
                }
            }

            var selectedIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(responseText);
            
            if (selectedIds != null && selectedIds.Any())
            {
                // Preserve order from Gemini, but lookup actual objects
                var filtered = new List<ArtistNode>();
                foreach (var id in selectedIds)
                {
                    var match = candidates.FirstOrDefault(c => c.Id == id);
                    if (match != null) filtered.Add(match);
                }
                return filtered;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Gemini Error: {ex.Message}");
        }

        // Fallback: Just take top N
        return candidates.Take(quantity).ToList();
    }

    public async Task<string> ExplainConnectionAsync(string source, string target)
    {
        var prompt = $@"
        You are a knowledgeable music critic.
        Explain the detailed musical connection between {source} and {target} in ONE sentence.
        
        Guidelines:
        - Mention specific sub-genres, instrumentation, or moods they share.
        - Be insightful rather than generic.
        - Avoid starting with ""Both artists"".
        - Keep it under 35 words.

        Example good output: ""Radiohead's experimental electronic textures in their later albums deeply influenced the atmospheric soundscapes of The Smile.""
        ";

        try
        {
            var text = await CallGeminiDirectAsync(prompt, false);
            return text.Trim();
        }
        catch (Exception ex)
        {
            // Debugging: Return the actual error to the UI
            return $"AI Error: {ex.Message}";
        }
    }
    
    // --- Gemini DTOs ---
    private class GeminiResponse { public List<GeminiCandidate>? Candidates { get; set; } }
    private class GeminiCandidate { public GeminiContent? Content { get; set; } }
    private class GeminiContent { public List<GeminiPart>? Parts { get; set; } }
    private class GeminiPart { public string Text { get; set; } = ""; }

    // --- New Helper to fetch data including images ---
    // Refactoring to Tuple for internal use
    private async Task<List<(string Name, string ImageUrl)>> FetchSimilarArtistsWithImagesAsync(string artist)
    {
        if (string.IsNullOrEmpty(_lastFmApiKey) || _lastFmApiKey.Contains("YOUR_LASTFM_API_KEY"))
        {
             return new List<(string, string)> { 
                 ("Radiohead", ""), ("The Smile", ""), ("Atoms for Peace", ""), ("Thom Yorke", ""), ("Alt-J", "") 
             };
        }

        try
        {
           var client = _httpClientFactory.CreateClient("LastFm");
           var url = $"http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist={Uri.EscapeDataString(artist)}&api_key={_lastFmApiKey}&format=json&limit=20";
           var response = await client.GetFromJsonAsync<LastFmResponse>(url);

           return response?.Similarartists?.Artist?.Select(a => (
               a.Name, 
               a.Image?.FirstOrDefault(i => i.Size == "extralarge" || i.Size == "large")?.Text ?? ""
           )).ToList() ?? new List<(string, string)>();
        }
        catch
        {
            return new List<(string, string)>();
        }
    }


    // --- Artist Details Logic ---
    public async Task<ArtistDetailsDto> GetArtistDetailsAsync(string artist)
    {
        if (string.IsNullOrEmpty(_lastFmApiKey) || _lastFmApiKey.Contains("YOUR_LASTFM_API_KEY"))
        {
             return new ArtistDetailsDto(artist, "Bio not available (Missing API Key).", "123,456", "10,000", new List<string> { "Rock", "Alternative" }, "");
        }

        try
        {
            var client = _httpClientFactory.CreateClient("LastFm");
            var url = $"http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist={Uri.EscapeDataString(artist)}&api_key={_lastFmApiKey}&format=json";
            var response = await client.GetFromJsonAsync<LastFmInfoResponse>(url);
            var info = response?.Artist;

            var imageUrl = info?.Image?.FirstOrDefault(i => i.Size == "extralarge" || i.Size == "mega")?.Text ?? "";

            // Spotify Fallback/Upgrade for Image
            try 
            {
               var spotifyArtist = await _spotifyService.SearchArtistAsync(artist);
               if (spotifyArtist?.Images?.Any() == true)
               {
                   // Spotify images are generally higher res/better than Last.fm
                   imageUrl = spotifyArtist.Images.First().Url;
               }
            }
            catch {} // Fallback is optional, don't break if Spotify fails

            return new ArtistDetailsDto(
                info?.Name ?? artist,
                info?.Bio?.Summary ?? "No bio available.",
                int.TryParse(info?.Stats?.Playcount, out var pc) ? $"{pc:N0}" : "0",
                int.TryParse(info?.Stats?.Listeners, out var lc) ? $"{lc:N0}" : "0",
                info?.Tags?.Tag?.Select(t => t.Name).Take(5).ToList() ?? new List<string>(),
                imageUrl
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Last.fm Info Error: {ex.Message}");
            return new ArtistDetailsDto(artist, "Error loading details.", "0", "0", new List<string>(), "");
        }
    }

    // internal DTOs for Last.fm XML/JSON
    private class LastFmResponse { 
        [System.Text.Json.Serialization.JsonPropertyName("similarartists")]
        public SimilarArtists? Similarartists { get; set; } 
    }
    private class SimilarArtists { 
        [System.Text.Json.Serialization.JsonPropertyName("artist")]
        public List<ArtistDto>? Artist { get; set; } 
    }
    private class ArtistDto 
    { 
        [System.Text.Json.Serialization.JsonPropertyName("name")]
        public string Name { get; set; } = ""; 
        [System.Text.Json.Serialization.JsonPropertyName("image")]
        public List<ImageDto>? Image { get; set; }
    }
    
    private class LastFmInfoResponse { 
        [System.Text.Json.Serialization.JsonPropertyName("artist")]
        public ArtistInfo? Artist { get; set; } 
    }
    private class ArtistInfo 
    { 
        [System.Text.Json.Serialization.JsonPropertyName("name")]
        public string Name { get; set; } = "";
        [System.Text.Json.Serialization.JsonPropertyName("bio")]
        public BioInfo? Bio { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("stats")]
        public StatsInfo? Stats { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("tags")]
        public TagsInfo? Tags { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("image")]
        public List<ImageDto>? Image { get; set; }
    }
    
    private class ImageDto 
    { 
        [System.Text.Json.Serialization.JsonPropertyName("#text")]
        public string Text { get; set; } = ""; 
        [System.Text.Json.Serialization.JsonPropertyName("size")]
        public string Size { get; set; } = ""; 
    }

    private class BioInfo { 
        [System.Text.Json.Serialization.JsonPropertyName("summary")]
        public string Summary { get; set; } = ""; 
    }
    private class StatsInfo { 
        [System.Text.Json.Serialization.JsonPropertyName("listeners")]
        public string Listeners { get; set; } = ""; 
        [System.Text.Json.Serialization.JsonPropertyName("playcount")]
        public string Playcount { get; set; } = ""; 
    }
    private class TagsInfo { 
        [System.Text.Json.Serialization.JsonPropertyName("tag")]
        public List<TagItem>? Tag { get; set; } 
    }
    private class TagItem { 
        [System.Text.Json.Serialization.JsonPropertyName("name")]
        public string Name { get; set; } = ""; 
    }
}

public record ArtistDetailsDto(string Name, string Bio, string Playcount, string Listeners, List<string> Tags, string ImageUrl);

public record TrackDto(string Title, string Plays, string Duration, string PreviewUrl);
