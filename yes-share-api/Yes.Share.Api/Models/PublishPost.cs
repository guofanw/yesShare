namespace Yes.Share.Api.Models;

public class PublishPost
{
    public int Id { get; set; }
    public string? Content { get; set; }
    public string TextFormat { get; set; } = "plain";
    public string? CodeLanguage { get; set; }
    public string? ImageStoredFileName { get; set; }
    public string? ImageFileName { get; set; }
    public string? ImageContentType { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
