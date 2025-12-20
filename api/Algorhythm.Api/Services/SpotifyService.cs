using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Algorhythm.Api.Services;

public interface ISpotifyService
{
    Task<SpotifyArtist?> SearchArtistAsync(string artistName);
    Task<List<SpotifyTrack>> GetTopTracksAsync(string artistId);
    Task<SpotifyAudioFeatures?> GetAudioFeaturesAsync(string trackId);
    Task<List<SpotifyAudioFeatures>> GetAudioFeaturesForTracksAsync(IEnumerable<string> trackIds);
}

public class SpotifyService : ISpotifyService
{
    private readonly HttpClient _httpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private string? _accessToken;
    private DateTime _tokenExpiration;

    public SpotifyService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient("Spotify");
        _clientId = configuration["Spotify:ClientId"] ?? throw new ArgumentNullException("Spotify:ClientId is missing");
        _clientSecret = configuration["Spotify:ClientSecret"] ?? throw new ArgumentNullException("Spotify:ClientSecret is missing");
    }

    private async Task EnsureAuthenticatedAsync()
    {
        if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiration)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
            return;
        }

        var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        var authHeader = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "grant_type", "client_credentials" }
        });

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<SpotifyTokenResponse>(json);

        if (tokenResponse != null)
        {
            Console.WriteLine("Spotify Auth Successful. Token expires in: " + tokenResponse.ExpiresIn);
            _accessToken = tokenResponse.AccessToken;
            // Subtract small buffer to be safe
            _tokenExpiration = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn - 60);
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        } else {
            Console.WriteLine("Spotify Auth Failed: Response deserialized to null.");
        }
    }

    public async Task<SpotifyArtist?> SearchArtistAsync(string artistName)
    {
        try {
            await EnsureAuthenticatedAsync();
            var response = await _httpClient.GetAsync($"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(artistName)}&type=artist&limit=1");
            if (!response.IsSuccessStatusCode) {
                Console.WriteLine($"Spotify Search Failed: {response.StatusCode}");
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<SpotifySearchResponse>(json);
            
            var artist = result?.Artists?.Items?.FirstOrDefault();
            if (artist == null) Console.WriteLine($"Spotify returned 0 results for '{artistName}'");
            return artist;
        } catch (Exception ex) {
            Console.WriteLine($"Spotify Search Exception: {ex.Message}");
            return null;
        }
    }

    public async Task<List<SpotifyTrack>> GetTopTracksAsync(string artistId)
    {
        await EnsureAuthenticatedAsync();
        // Market=US is required for Top Tracks
        var response = await _httpClient.GetAsync($"https://api.spotify.com/v1/artists/{artistId}/top-tracks?market=US");
        if (!response.IsSuccessStatusCode) return new List<SpotifyTrack>();

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<SpotifyTopTracksResponse>(json);
        
        return result?.Tracks ?? new List<SpotifyTrack>();
    }

    public async Task<SpotifyAudioFeatures?> GetAudioFeaturesAsync(string trackId)
    {
        await EnsureAuthenticatedAsync();
        var response = await _httpClient.GetAsync($"https://api.spotify.com/v1/audio-features/{trackId}");
        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<SpotifyAudioFeatures>(json);
    }
    
    public async Task<List<SpotifyAudioFeatures>> GetAudioFeaturesForTracksAsync(IEnumerable<string> trackIds)
    {
        await EnsureAuthenticatedAsync();
        var ids = string.Join(",", trackIds.Take(100)); // API limit is 100
        var response = await _httpClient.GetAsync($"https://api.spotify.com/v1/audio-features?ids={ids}");
        if (!response.IsSuccessStatusCode) return new List<SpotifyAudioFeatures>();

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<SpotifyAudioFeaturesListResponse>(json);
        return result?.AudioFeatures ?? new List<SpotifyAudioFeatures>();
    }
}

// DTOs
public class SpotifyTokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = "";
    
    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }
}

public class SpotifySearchResponse
{
    [JsonPropertyName("artists")]
    public SpotifyArtistList? Artists { get; set; }
}

public class SpotifyArtistList
{
    [JsonPropertyName("items")]
    public List<SpotifyArtist>? Items { get; set; }
}

public class SpotifyArtist
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
    
    [JsonPropertyName("images")]
    public List<SpotifyImage>? Images { get; set; }
    
    [JsonPropertyName("popularity")]
    public int Popularity { get; set; }
    
    [JsonPropertyName("genres")]
    public List<string>? Genres { get; set; }
}

public class SpotifyImage
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = "";
    
    [JsonPropertyName("height")]
    public int Height { get; set; }
    
    [JsonPropertyName("width")]
    public int Width { get; set; }
}

public class SpotifyTopTracksResponse
{
    [JsonPropertyName("tracks")]
    public List<SpotifyTrack>? Tracks { get; set; }
}

public class SpotifyTrack
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
    
    [JsonPropertyName("preview_url")]
    public string? PreviewUrl { get; set; }

     [JsonPropertyName("album")]
    public SpotifyAlbum? Album { get; set; }
}

public class SpotifyAlbum 
{
     [JsonPropertyName("images")]
    public List<SpotifyImage>? Images { get; set; }
}

public class SpotifyAudioFeaturesListResponse
{
    [JsonPropertyName("audio_features")]
    public List<SpotifyAudioFeatures>? AudioFeatures { get; set; }
}

public class SpotifyAudioFeatures
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";
    
    [JsonPropertyName("danceability")]
    public float Danceability { get; set; }
    
    [JsonPropertyName("energy")]
    public float Energy { get; set; }
    
    [JsonPropertyName("valence")]
    public float Valence { get; set; }
    
    [JsonPropertyName("tempo")]
    public float Tempo { get; set; }
}
