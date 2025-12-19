using Algorhythm.Api.Models;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

namespace Algorhythm.Api.Services;

public class MusicIntelligenceService
{
    private readonly IChatCompletionService _chatCompletionService;
    private readonly Kernel _kernel;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _lastFmApiKey;

    public MusicIntelligenceService(Kernel kernel, IChatCompletionService chatCompletionService, IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _kernel = kernel;
        _chatCompletionService = chatCompletionService;
        _httpClientFactory = httpClientFactory;
        _lastFmApiKey = configuration["LastFm:ApiKey"] ?? "";
    }

    public async Task<List<ArtistNode>> GetRecommendationsAsync(string seedArtist, float targetValence, float targetEnergy, bool obscure, int quantity, bool eraMatch, bool enableAI)
    {
        // 1. Fetch similar artists from Last.fm (Name + ImageUrl)
        var candidates = await FetchSimilarArtistsWithImagesAsync(seedArtist);

        // 2. Mock Spotify feature enrichment (receiving tuples now)
        var enriched = await EnrichWithAudioFeaturesAsync(candidates);

        // 3. Filter with Gemini 3.0 Pro OR return raw list
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

    private async Task<List<string>> FetchSimilarArtistsAsync(string artist)
    {
        // ... (existing fallback logic unchanged) ...
        if (string.IsNullOrEmpty(_lastFmApiKey) || _lastFmApiKey.Contains("YOUR_LASTFM_API_KEY"))
        {
            return new List<string> { "Radiohead", "The Smile", "Atoms for Peace", "Thom Yorke", "Alt-J" };
        }

        try
        {
            var client = _httpClientFactory.CreateClient("LastFm");
            var url = $"http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist={Uri.EscapeDataString(artist)}&api_key={_lastFmApiKey}&format=json&limit=20";
            var response = await client.GetFromJsonAsync<LastFmResponse>(url);
            
            // Should verify if we can return objects here instead of just strings
            // But GetRecommendationsAsync expects ArtistNode.
            // Wait, this method only returns List<string>. We need to change it to return richer objects 
            // OR we store a dictionary of images to look up later.
            // For now, let's keep it simple: DTOs inside EnrichWithAudioFeaturesAsync will just use placeholder.
            // ACTUALLY: limiting to just names here prevents us from using the images we just fetched.
            // I should refactor this to return a list of (Name, ImageUrl).
            
            return response?.Similarartists?.Artist?.Select(a => a.Name).ToList() ?? new List<string>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Last.fm Error: {ex.Message}");
            return new List<string> { "Error Fetching Data" };
        }
    }

    // --- Top Tracks Logic (iTunes for Audio Previews) ---
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
                "Popular", // iTunes doesn't expose playcounts publicly, implies popularity by rank
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

    private Task<List<ArtistNode>> EnrichWithAudioFeaturesAsync(List<(string Name, string ImageUrl)> artists)
    {
        var rng = new Random();
        var nodes = artists.Select(a => new ArtistNode(
            Id: Guid.NewGuid().ToString(),
            Name: a.Name,
            ImageUrl: !string.IsNullOrEmpty(a.ImageUrl) ? a.ImageUrl : $"https://placehold.co/200x200?text={a.Name}",
            IsFavorited: false,
            Tags: new List<string> { "Artist" }, 
            Era: "2020s",
            AudioFeatures: new AudioFeatures(
                Valence: (float)rng.NextDouble(),
                Energy: (float)rng.NextDouble()
            )
        )).ToList();

        return Task.FromResult(nodes);
    }

    private async Task<List<ArtistNode>> FilterWithGeminiAsync(List<ArtistNode> candidates, float valence, float energy, bool obscure, int quantity, bool eraMatch)
    {
        // For scaffold, we'll just take the top N to show the slider working.
        // In real impl, we'd add these to the prompt.
        
        var prompt = $@"
        Analyze these artists based on the user's vibe:
        Target Valence: {valence}
        Target Energy: {energy}
        Obscurity Preferred: {obscure}
        Era Match: {eraMatch}
        
        Candidates:
        {string.Join("\n", candidates.Select(c => $"- {c.Id} (Valence: {c.AudioFeatures.Valence}, Energy: {c.AudioFeatures.Energy})"))}

        Return the JSON list of IDs (max {quantity}) that match the vibe.
        ";

        // Mock filtering by just taking the requested quantity
        return candidates.Take(quantity).ToList();
    }
    
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
