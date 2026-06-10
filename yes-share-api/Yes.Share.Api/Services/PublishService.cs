using Microsoft.EntityFrameworkCore;
using Yes.Share.Api.Data;
using Yes.Share.Api.Dtos;
using Yes.Share.Api.Models;

namespace Yes.Share.Api.Services;

public class PublishService : IPublishService
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp"
    };

    private static readonly HashSet<string> AllowedCodeLanguages = new(StringComparer.OrdinalIgnoreCase)
    {
        "json", "csharp", "typescript", "shell", "vue", "cpp", "java", "html"
    };

    private readonly AppDbContext _context;
    private readonly string _publishImagePath;

    public PublishService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;

        var basePath = AppDomain.CurrentDomain.BaseDirectory;
        var uploadBasePath = Path.IsPathRooted(configuration["FileStorage:UploadPath"] ?? "Uploads")
            ? configuration["FileStorage:UploadPath"]!
            : Path.Combine(basePath, configuration["FileStorage:UploadPath"] ?? "Uploads");

        _publishImagePath = Path.Combine(uploadBasePath, "Publish");
        if (!Directory.Exists(_publishImagePath))
        {
            Directory.CreateDirectory(_publishImagePath);
        }
    }

    public async Task<PublishPostDto> CreatePostAsync(CreatePublishPostRequest request, int userId, string userName)
    {
        var content = request.Content?.Trim();
        var hasText = !string.IsNullOrWhiteSpace(content);
        var hasImage = request.Image is { Length: > 0 };
        if (!hasText && !hasImage)
        {
            throw new InvalidOperationException("请至少填写文本内容或上传一张图片。");
        }

        if (content?.Length > 2000)
        {
            throw new InvalidOperationException("发布内容长度不能超过 2000 字符。");
        }

        var (textFormat, codeLanguage) = ResolveTextFormat(content, request.TextFormat, request.CodeLanguage);

        string? imageStoredFileName = null;
        string? imageFileName = null;
        string? imageContentType = null;

        if (hasImage)
        {
            ValidateImage(request.Image!);

            imageStoredFileName = $"{Guid.NewGuid():N}{Path.GetExtension(request.Image!.FileName)}";
            imageFileName = request.Image.FileName;
            imageContentType = string.IsNullOrWhiteSpace(request.Image.ContentType)
                ? "application/octet-stream"
                : request.Image.ContentType;

            var imagePath = Path.Combine(_publishImagePath, imageStoredFileName);
            await using var stream = new FileStream(imagePath, FileMode.Create);
            await request.Image.CopyToAsync(stream);
        }

        var post = new PublishPost
        {
            Content = hasText ? content : null,
            TextFormat = textFormat,
            CodeLanguage = codeLanguage,
            ImageStoredFileName = imageStoredFileName,
            ImageFileName = imageFileName,
            ImageContentType = imageContentType,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.PublishPosts.Add(post);
        _context.SystemLogs.Add(new SystemLog
        {
            Action = "Publish",
            UserId = userId,
            UserName = userName,
            Details = "Published new post",
            DataSize = imageStoredFileName is null ? 0 : request.Image!.Length
        });

        await _context.SaveChangesAsync();

        return MapToDto(post, userName);
    }

    public async Task<PublishPostPageDto> GetPostsAsync(int page, int pageSize, string? keyword)
    {
        var safePage = page <= 0 ? 1 : page;
        var safePageSize = pageSize switch
        {
            <= 0 => 10,
            > 50 => 50,
            _ => pageSize
        };

        IQueryable<PublishPost> query = _context.PublishPosts
            .AsNoTracking()
            .Include(p => p.User);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var trimmedKeyword = keyword.Trim();
            query = query.Where(p =>
                (p.Content != null && p.Content.Contains(trimmedKeyword)) ||
                (p.ImageFileName != null && p.ImageFileName.Contains(trimmedKeyword)) ||
                (p.User != null && p.User.Username.Contains(trimmedKeyword)));
        }

        var totalCount = await query.CountAsync();
        var totalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)safePageSize);
        if (safePage > totalPages)
        {
            safePage = totalPages;
        }

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync();

        var summary = new PublishSummaryDto(
            totalCount,
            await _context.PublishPosts.AsNoTracking().MaxAsync(p => (DateTime?)p.CreatedAt),
            await _context.PublishPosts.AsNoTracking().CountAsync(p => p.TextFormat == "code"),
            await _context.PublishPosts.AsNoTracking().CountAsync(p => p.ImageStoredFileName != null)
        );

        return new PublishPostPageDto(
            items.Select(p => MapToDto(p, p.User?.Username ?? "Unknown")).ToList(),
            safePage,
            safePageSize,
            totalCount,
            totalPages,
            summary
        );
    }

    public Task<PublishPost?> GetPostAsync(int id)
    {
        return _context.PublishPosts.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
    }

    public Stream GetImageStream(string storedFileName)
    {
        var filePath = Path.Combine(_publishImagePath, storedFileName);
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("图片不存在。");
        }

        return new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    private static (string TextFormat, string? CodeLanguage) ResolveTextFormat(string? content, string? textFormat, string? codeLanguage)
    {
        var normalizedTextFormat = textFormat?.Trim().ToLowerInvariant();
        if (string.Equals(normalizedTextFormat, "auto", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(normalizedTextFormat))
        {
            return DetectTextFormat(content);
        }

        if (string.Equals(textFormat, "code", StringComparison.OrdinalIgnoreCase))
        {
            return ("code", NormalizeCodeLanguage(codeLanguage, "code"));
        }

        return ("plain", null);
    }

    private static string? NormalizeCodeLanguage(string? codeLanguage, string textFormat)
    {
        if (!string.Equals(textFormat, "code", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(codeLanguage))
        {
            throw new InvalidOperationException("代码内容必须选择语言类型。");
        }

        var normalized = codeLanguage.Trim().ToLowerInvariant();
        if (!AllowedCodeLanguages.Contains(normalized))
        {
            throw new InvalidOperationException("不支持的代码语言类型。");
        }

        return normalized;
    }

    private static (string TextFormat, string? CodeLanguage) DetectTextFormat(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return ("plain", null);
        }

        var trimmed = content.Trim();

        if (LooksLikeJson(trimmed))
        {
            return ("code", "json");
        }

        if (trimmed.Contains("<template", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("<script", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("<style", StringComparison.OrdinalIgnoreCase))
        {
            return ("code", "vue");
        }

        if (trimmed.Contains("<!DOCTYPE html", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("<html", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("</body>", StringComparison.OrdinalIgnoreCase))
        {
            return ("code", "html");
        }

        if (trimmed.Contains("using ", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("namespace ", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("public class ", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("Console.WriteLine", StringComparison.OrdinalIgnoreCase))
        {
            return ("code", "csharp");
        }

        if (trimmed.Contains("interface ", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("type ", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("const ", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("let ", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains(": string", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains(": number", StringComparison.OrdinalIgnoreCase))
        {
            return ("code", "typescript");
        }

        if (trimmed.Contains("#include", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("std::", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("int main(", StringComparison.OrdinalIgnoreCase))
        {
            return ("code", "cpp");
        }

        if (trimmed.Contains("public static void main", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("System.out.println", StringComparison.OrdinalIgnoreCase))
        {
            return ("code", "java");
        }

        if (trimmed.Contains("@echo off", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("set ", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("cd /d", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains("dir", StringComparison.OrdinalIgnoreCase))
        {
            return ("code", "shell");
        }

        return ("plain", null);
    }

    private static bool LooksLikeJson(string content)
    {
        if (!(content.StartsWith("{") && content.EndsWith("}")) &&
            !(content.StartsWith("[") && content.EndsWith("]")))
        {
            return false;
        }

        try
        {
            using var _ = System.Text.Json.JsonDocument.Parse(content);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static void ValidateImage(IFormFile image)
    {
        var extension = Path.GetExtension(image.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedImageExtensions.Contains(extension))
        {
            throw new InvalidOperationException("仅支持 jpg、jpeg、png、gif、webp 图片格式。");
        }
    }

    private static PublishPostDto MapToDto(PublishPost post, string userName)
    {
        var imageUrl = post.ImageStoredFileName is null ? null : $"/api/publish/{post.Id}/image";
        return new PublishPostDto(
            post.Id,
            post.Content,
            post.TextFormat,
            post.CodeLanguage,
            imageUrl,
            post.ImageFileName,
            userName,
            post.CreatedAt
        );
    }
}
