using System.ComponentModel.DataAnnotations;

namespace Algorhythm.Api.Models;

using System.Text.Json.Serialization;

public class ArtistNode
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("imageUrl")]
    public string ImageUrl { get; set; } = "";

    [JsonPropertyName("isFavorited")]
    public bool IsFavorited { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("era")]
    public string Era { get; set; } = "";

    [JsonPropertyName("audioFeatures")]
    public AudioFeatures AudioFeatures { get; set; }

    public ArtistNode(string id, string name, string imageUrl, bool isFavorited, List<string> tags, string era, AudioFeatures audioFeatures)
    {
        Id = id;
        Name = name;
        ImageUrl = imageUrl;
        IsFavorited = isFavorited;
        Tags = tags;
        Era = era;
        AudioFeatures = audioFeatures;
    }
}

public class AudioFeatures
{
    [JsonPropertyName("valence")]
    public float Valence { get; set; }

    [JsonPropertyName("energy")]
    public float Energy { get; set; }

    public AudioFeatures(float valence, float energy)
    {
        Valence = valence;
        Energy = energy;
    }
}
