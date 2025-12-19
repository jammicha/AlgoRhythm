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
    modelId: "gemini-1.5-pro", // Changing to 1.5-pro as 3.0 might not be the exact string yet, or usually it's just a model ID string.
    apiKey: builder.Configuration["Gemini:ApiKey"] ?? "PLACEHOLDER_API_KEY"
);

// Add HttpClient
builder.Services.AddHttpClient("LastFm", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "Algorhythm/1.0 (Integration Test)");
});

builder.Services.AddScoped<MusicIntelligenceService>();

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
