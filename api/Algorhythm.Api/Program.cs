using Algorhythm.Api.Services;
using Microsoft.SemanticKernel;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Add Semantic Kernel
builder.Services.AddKernel();
builder.Services.AddGoogleAIGeminiChatCompletion(
    modelId: "gemini-3.0-flash-preview", // User requested 3.0 Flash Preview
    apiKey: builder.Configuration["Gemini:ApiKey"] ?? "PLACEHOLDER_API_KEY"
);

// Add HttpClient
builder.Services.AddHttpClient("LastFm", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "Algorhythm/1.0 (Integration Test)");
});
builder.Services.AddHttpClient("Spotify", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "Algorhythm/1.0");
});

builder.Services.AddScoped<MusicIntelligenceService>();
builder.Services.AddScoped<ISpotifyService, SpotifyService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientPermission", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://green-grass-0fe8b9610.4.azurestaticapps.net")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("ClientPermission");

app.UseAuthorization();

app.MapControllers();

app.Run();
