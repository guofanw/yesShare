using Microsoft.EntityFrameworkCore;
using Yes.Share.Api.Data;
using Yes.Share.Api.Dtos;
using Yes.Share.Api.Models;

namespace Yes.Share.Api.Services;

public class FileService : IFileService
{
    private readonly AppDbContext _context;
    private readonly string _uploadPath;
    private readonly string _tempPath;

    public FileService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _uploadPath = configuration["FileStorage:UploadPath"] ?? "Uploads";
        _tempPath = Path.Combine(_uploadPath, "Temp");
        
        if (!Directory.Exists(_uploadPath)) Directory.CreateDirectory(_uploadPath);
        if (!Directory.Exists(_tempPath)) Directory.CreateDirectory(_tempPath);
    }

    public async Task<SharedFile> UploadFileAsync(IFormFile file, int uploaderId)
    {
        var storedFileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(_uploadPath, storedFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var sharedFile = new SharedFile
        {
            FileName = file.FileName,
            StoredFileName = storedFileName,
            FileSize = file.Length,
            ContentType = file.ContentType,
            UploaderId = uploaderId,
            UploadTime = DateTime.UtcNow
        };

        _context.SharedFiles.Add(sharedFile);
        
        // Log
        _context.SystemLogs.Add(new SystemLog 
        { 
            Action = "Upload", 
            UserId = uploaderId, 
            Details = $"Uploaded {file.FileName}",
            DataSize = file.Length
        });
        
        await _context.SaveChangesAsync();
        return sharedFile;
    }

    public Task<string> InitChunkUploadAsync(ChunkUploadInitRequest request, int uploaderId)
    {
        var uploadId = Guid.NewGuid().ToString("N");
        // We could store metadata about this upload in DB or a memory cache, 
        // but for simplicity we just rely on the temp file existence.
        // Or create a 0-byte file.
        var filePath = Path.Combine(_tempPath, uploadId);
        // Create empty file
        System.IO.File.Create(filePath).Dispose();
        
        return Task.FromResult(uploadId);
    }

    public async Task AppendChunkAsync(string uploadId, IFormFile chunk)
    {
        var filePath = Path.Combine(_tempPath, uploadId);
        if (!System.IO.File.Exists(filePath)) throw new FileNotFoundException("Upload session not found");

        using (var stream = new FileStream(filePath, FileMode.Append))
        {
            await chunk.CopyToAsync(stream);
        }
    }

    public async Task<SharedFile> FinishChunkUploadAsync(string uploadId, string fileName, int uploaderId)
    {
        var tempFilePath = Path.Combine(_tempPath, uploadId);
        if (!System.IO.File.Exists(tempFilePath)) throw new FileNotFoundException("Upload session not found");

        var storedFileName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var finalPath = Path.Combine(_uploadPath, storedFileName);

        System.IO.File.Move(tempFilePath, finalPath);

        var fileInfo = new FileInfo(finalPath);
        
        var sharedFile = new SharedFile
        {
            FileName = fileName,
            StoredFileName = storedFileName,
            FileSize = fileInfo.Length,
            ContentType = "application/octet-stream", // Could infer from extension
            UploaderId = uploaderId,
            UploadTime = DateTime.UtcNow
        };

        _context.SharedFiles.Add(sharedFile);
        
        _context.SystemLogs.Add(new SystemLog 
        { 
            Action = "Upload", 
            UserId = uploaderId, 
            Details = $"Uploaded {fileName} (Chunked)",
            DataSize = fileInfo.Length
        });

        await _context.SaveChangesAsync();
        return sharedFile;
    }

    public async Task<IEnumerable<FileDto>> GetFilesAsync(int userId, bool isAdmin)
    {
        IQueryable<SharedFile> query = _context.SharedFiles.Include(f => f.Uploader);

        if (!isAdmin)
        {
            // User sees: Own files OR Public files OR Files shared with them (Permission logic)
            // For now, let's implement: Own files + Public files. 
            // The requirement "查看被明确分享给自己的文件" requires checking FilePermissions.
            
            query = query.Where(f => 
                f.UploaderId == userId || 
                f.IsPublic || 
                f.Permissions.Any(p => p.TargetUserId == userId || p.TargetRole == "User")); // Assuming "User" role for now
        }

        var files = await query.OrderByDescending(f => f.UploadTime).ToListAsync();

        return files.Select(f => new FileDto(
            f.Id,
            f.FileName,
            f.FileSize,
            f.ContentType,
            f.Uploader?.Username ?? "Unknown",
            f.UploadTime,
            f.ShareToken,
            f.IsPublic
        ));
    }

    public async Task<SharedFile?> GetFileAsync(int fileId)
    {
        return await _context.SharedFiles
            .Include(f => f.Uploader)
            .FirstOrDefaultAsync(f => f.Id == fileId);
    }
    
    public async Task<SharedFile?> GetFileByTokenAsync(string token)
    {
        return await _context.SharedFiles
            .Include(f => f.Uploader)
            .FirstOrDefaultAsync(f => f.ShareToken == token);
    }

    public async Task DeleteFileAsync(int fileId, int userId, bool isAdmin)
    {
        var file = await _context.SharedFiles.FindAsync(fileId);
        if (file == null) return;

        if (!isAdmin && file.UploaderId != userId)
        {
            throw new UnauthorizedAccessException("Cannot delete file");
        }

        // Delete from disk
        var path = Path.Combine(_uploadPath, file.StoredFileName);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

        _context.SharedFiles.Remove(file);
        
        _context.SystemLogs.Add(new SystemLog 
        { 
            Action = "Delete", 
            UserId = userId, 
            Details = $"Deleted {file.FileName}" 
        });
        
        await _context.SaveChangesAsync();
    }

    public async Task<string> GetFileContentAsync(int fileId)
    {
        var file = await _context.SharedFiles.FindAsync(fileId);
        if (file == null) throw new FileNotFoundException();

        // Check extension or content type
        var ext = Path.GetExtension(file.FileName).ToLower();
        var allowedExts = new[] { ".txt", ".json", ".js", ".py", ".java", ".cs", ".cpp", ".html", ".css", ".md", ".xml", ".log" };
        
        if (!allowedExts.Contains(ext))
        {
             // Maybe read first few bytes to check if binary? 
             // For now just restrict by extension for safety.
             throw new InvalidOperationException("File type not supported for text preview");
        }

        var path = Path.Combine(_uploadPath, file.StoredFileName);
        if (!System.IO.File.Exists(path)) throw new FileNotFoundException("File not found on disk");

        return await System.IO.File.ReadAllTextAsync(path);
    }

    public Stream GetFileStream(string storedFileName)
    {
        var path = Path.Combine(_uploadPath, storedFileName);
        if (!System.IO.File.Exists(path)) throw new FileNotFoundException("File not found on disk");
        return new FileStream(path, FileMode.Open, FileAccess.Read);
    }

    public async Task LogDownloadAsync(int fileId, int? userId)
    {
        var file = await _context.SharedFiles.FindAsync(fileId);
        if (file != null)
        {
            _context.SystemLogs.Add(new SystemLog 
            { 
                Action = "Download", 
                UserId = userId, 
                Details = $"Downloaded {file.FileName}",
                DataSize = file.FileSize
            });
            await _context.SaveChangesAsync();
        }
    }
}
