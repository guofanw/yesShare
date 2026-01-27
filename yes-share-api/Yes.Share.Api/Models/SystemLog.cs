namespace Yes.Share.Api.Models;

public class SystemLog
{
    public int Id { get; set; }
    public required string Action { get; set; } // "Upload", "Download", "Delete", "Login"
    public int? UserId { get; set; }
    public string? UserName { get; set; } // Snapshot of username
    public string? Details { get; set; } // e.g., "Uploaded file X"
    public long DataSize { get; set; } = 0; // Size in bytes if applicable
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
