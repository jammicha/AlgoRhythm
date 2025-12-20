using Algorhythm.Api.Models;
using Algorhythm.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Algorhythm.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DiscoveryController : ControllerBase
{
    private readonly MusicIntelligenceService _service;

    public DiscoveryController(MusicIntelligenceService service)
    {
        _service = service;
    }

    [HttpPost("recommend")]
    public async Task<IActionResult> Recommend([FromBody] RecommendationRequest request)
    {
        var results = await _service.GetRecommendationsAsync(request.SeedArtist, request.Valence, request.Energy, request.Obscure, request.Quantity, request.EraMatch, request.EnableAI);
        return Ok(results);
    }

    [HttpGet("tracks")]
    public async Task<IActionResult> GetTopTracks([FromQuery] string artist)
    {
        if (string.IsNullOrEmpty(artist)) return BadRequest("Artist name required");
        var tracks = await _service.GetTopTracksAsync(artist);
        return Ok(tracks);
    }

    [HttpGet("artist-details")]
    public async Task<IActionResult> GetArtistDetails([FromQuery] string artist)
    {
        if (string.IsNullOrEmpty(artist)) return BadRequest("Artist name required");
        var details = await _service.GetArtistDetailsAsync(artist);
        return Ok(details);
    }



    [HttpPost("explain-connection")]
    public async Task<IActionResult> ExplainConnection([FromBody] ExplainRequest request)
    {
        var explanation = await _service.ExplainConnectionAsync(request.Source, request.Target);
        return Ok(new { Explanation = explanation });
    }

    [HttpPost("analyze-taste")]
    public IActionResult AnalyzeTaste()
    {
        return Ok(new { Message = "Taste analysis not implemented yet." });
    }
}

public record ExplainRequest(string Source, string Target);
public record RecommendationRequest(string SeedArtist, float Valence, float Energy, bool Obscure, int Quantity, bool EraMatch, bool EnableAI = true);
