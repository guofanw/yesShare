namespace Yes.Share.Api.Models;

public class FilePermission
{
    public int Id { get; set; }
    
    public int SharedFileId { get; set; }
    public SharedFile? SharedFile { get; set; }
    
    // Permission target: Specific User
    public int? TargetUserId { get; set; }
    public User? TargetUser { get; set; }
    
    // Permission target: Role (e.g., "Admin", "User") - though admins usually have full access anyway
    public string? TargetRole { get; set; } 
    
    public bool CanRead { get; set; } = true;
}
