using System.ComponentModel.DataAnnotations;

namespace Algorhythm.Api.Models;

public record ArtistNode(
    string Id,
    string Name,
    string ImageUrl,
    bool IsFavorited,
    List<string> Tags,
    string Era,
    AudioFeatures AudioFeatures
);

public record AudioFeatures(
    float Valence,
    float Energy
);
