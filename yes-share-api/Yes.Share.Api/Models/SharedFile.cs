namespace Yes.Share.Api.Models;

public class SharedFile
{
    public int Id { get; set; }
    public required string FileName { get; set; }
    public required string StoredFileName { get; set; } // Actual file name on disk
    public long FileSize { get; set; }
    public string ContentType { get; set; } = "application/octet-stream";
    
    public int UploaderId { get; set; }
    public User? Uploader { get; set; }
    
    public DateTime UploadTime { get; set; } = DateTime.UtcNow;
    
    public string ShareToken { get; set; } = Guid.NewGuid().ToString("N"); // Unique link token
    
    // Permissions
    public bool IsPublic { get; set; } = false; // If true, anyone can access
    public List<FilePermission> Permissions { get; set; } = new();
}
