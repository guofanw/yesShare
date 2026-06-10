using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Yes.Share.Api.Data;
using Yes.Share.Api.Filters;
using Yes.Share.Api.Models;
using Yes.Share.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<UserActivityFilter>();
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Yes.Share API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<IPublishService, PublishService>();

// JWT Auth
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && 
                (path.StartsWithSegments("/api/file") || path.StartsWithSegments("/api/system") || path.StartsWithSegments("/api/publish"))) // Allow for file downloads
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!))
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Ensure DB Created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS PublishPosts (
            Id INTEGER NOT NULL CONSTRAINT PK_PublishPosts PRIMARY KEY AUTOINCREMENT,
            Content TEXT NULL,
            TextFormat TEXT NOT NULL,
            CodeLanguage TEXT NULL,
            ImageStoredFileName TEXT NULL,
            ImageFileName TEXT NULL,
            ImageContentType TEXT NULL,
            UserId INTEGER NOT NULL,
            CreatedAt TEXT NOT NULL,
            CONSTRAINT FK_PublishPosts_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id) ON DELETE CASCADE
        );
        """);
    db.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS IX_PublishPosts_UserId ON PublishPosts (UserId);");
    db.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS IX_PublishPosts_CreatedAt ON PublishPosts (CreatedAt);");
    
    // Create default admin if not exists
    if (!db.Users.Any(u => u.Role == "Admin"))
    {
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        // Default Admin: admin / admin123
        var admin = new Yes.Share.Api.Models.User 
        { 
            Username = "admin", 
            PasswordHash = authService.HashPassword("admin123"), 
            Role = "Admin" 
        };
        db.Users.Add(admin);
        db.SaveChanges();
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles(); // For frontend later
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
