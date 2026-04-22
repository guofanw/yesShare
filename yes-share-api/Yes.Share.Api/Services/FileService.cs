using System.Text.Json;
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
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private sealed record ChunkUploadMeta(string UploadId, string FileName, long TotalSize, int UploaderId, int? ParentId, DateTime CreatedAtUtc);

    private string GetChunkTempFilePath(string uploadId) => Path.Combine(_tempPath, uploadId);
    private string GetChunkMetaPath(string uploadId) => Path.Combine(_tempPath, $"{uploadId}.meta.json");

    public FileService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        var basePath = AppDomain.CurrentDomain.BaseDirectory;
        _uploadPath = Path.IsPathRooted(configuration["FileStorage:UploadPath"] ?? "Uploads")
            ? configuration["FileStorage:UploadPath"]!
            : Path.Combine(basePath, configuration["FileStorage:UploadPath"] ?? "Uploads");
        _tempPath = Path.Combine(_uploadPath, "Temp");

        Console.WriteLine($"[FileService] UploadPath: {_uploadPath}");
        Console.WriteLine($"[FileService] TempPath: {_tempPath}");

        if (!Directory.Exists(_uploadPath)) Directory.CreateDirectory(_uploadPath);
        if (!Directory.Exists(_tempPath)) Directory.CreateDirectory(_tempPath);
    }

    public async Task<SharedFile> UploadFileAsync(IFormFile file, int uploaderId, int? parentId)
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
            UploadTime = DateTime.UtcNow,
            ParentId = parentId,
            IsFolder = false
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

    public async Task<SharedFile> CreateFolderAsync(string folderName, int? parentId, int uploaderId)
    {
        var folder = new SharedFile
        {
            FileName = folderName,
            StoredFileName = "", // No physical file
            FileSize = 0,
            ContentType = "inode/directory",
            UploaderId = uploaderId,
            UploadTime = DateTime.UtcNow,
            ParentId = parentId,
            IsFolder = true
        };
        
        _context.SharedFiles.Add(folder);
        await _context.SaveChangesAsync();
        return folder;
    }

    public Task<string> InitChunkUploadAsync(ChunkUploadInitRequest request, int uploaderId)
    {
        var uploadId = Guid.NewGuid().ToString("N");
        var filePath = GetChunkTempFilePath(uploadId);
        var metaPath = GetChunkMetaPath(uploadId);

        System.IO.File.Create(filePath).Dispose();

        var meta = new ChunkUploadMeta(
            uploadId,
            request.FileName,
            request.TotalSize,
            uploaderId,
            request.ParentId,
            DateTime.UtcNow
        );
        var metaJson = JsonSerializer.Serialize(meta, JsonOptions);
        System.IO.File.WriteAllText(metaPath, metaJson);
        
        return Task.FromResult(uploadId);
    }

    public async Task AppendChunkAsync(string uploadId, Stream chunkStream, int uploaderId)
    {
        var filePath = GetChunkTempFilePath(uploadId);
        var metaPath = GetChunkMetaPath(uploadId);

        if (!System.IO.File.Exists(filePath) || !System.IO.File.Exists(metaPath))
        {
            Console.WriteLine($"[FileService] AppendChunkAsync failed: session not found. uploadId={uploadId}");
            throw new FileNotFoundException("Upload session not found");
        }

        var metaJson = await System.IO.File.ReadAllTextAsync(metaPath);
        var meta = JsonSerializer.Deserialize<ChunkUploadMeta>(metaJson, JsonOptions);
        if (meta == null || meta.UploaderId != uploaderId)
        {
            throw new UnauthorizedAccessException("Upload session not found");
        }

        const int bufferSize = 1024 * 128;
        var buffer = new byte[bufferSize];
        long bytesWritten = 0;

        using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
        fileStream.Seek(0, SeekOrigin.End);
        var existingSize = fileStream.Length;

        if (existingSize > meta.TotalSize)
        {
            throw new InvalidOperationException("Upload session is corrupted");
        }

        while (true)
        {
            var read = await chunkStream.ReadAsync(buffer.AsMemory(0, buffer.Length));
            if (read <= 0) break;

            if (existingSize + bytesWritten + read > meta.TotalSize)
            {
                throw new InvalidOperationException("Chunk exceeds expected total size");
            }

            await fileStream.WriteAsync(buffer.AsMemory(0, read));
            bytesWritten += read;
        }
    }

    public async Task<ChunkUploadStatusResponse> GetChunkUploadStatusAsync(string uploadId, int uploaderId)
    {
        var filePath = GetChunkTempFilePath(uploadId);
        var metaPath = GetChunkMetaPath(uploadId);

        if (!System.IO.File.Exists(filePath) || !System.IO.File.Exists(metaPath))
        {
            throw new FileNotFoundException("Upload session not found");
        }

        var metaJson = await System.IO.File.ReadAllTextAsync(metaPath);
        var meta = JsonSerializer.Deserialize<ChunkUploadMeta>(metaJson, JsonOptions);
        if (meta == null || meta.UploaderId != uploaderId)
        {
            throw new FileNotFoundException("Upload session not found");
        }

        var received = new FileInfo(filePath).Length;
        var isFinished = received >= meta.TotalSize;
        return new ChunkUploadStatusResponse(meta.UploadId, meta.FileName, meta.TotalSize, received, meta.ParentId, isFinished);
    }

    public Task CancelChunkUploadAsync(string uploadId, int uploaderId)
    {
        var filePath = GetChunkTempFilePath(uploadId);
        var metaPath = GetChunkMetaPath(uploadId);

        if (!System.IO.File.Exists(metaPath))
        {
            return Task.CompletedTask;
        }

        var metaJson = System.IO.File.ReadAllText(metaPath);
        var meta = JsonSerializer.Deserialize<ChunkUploadMeta>(metaJson, JsonOptions);
        if (meta == null || meta.UploaderId != uploaderId)
        {
            return Task.CompletedTask;
        }

        if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
        if (System.IO.File.Exists(metaPath)) System.IO.File.Delete(metaPath);
        return Task.CompletedTask;
    }

    public async Task<SharedFile> FinishChunkUploadAsync(string uploadId, string fileName, int uploaderId, int? parentId)
    {
        var tempFilePath = GetChunkTempFilePath(uploadId);
        var metaPath = GetChunkMetaPath(uploadId);
        if (!System.IO.File.Exists(tempFilePath) || !System.IO.File.Exists(metaPath)) throw new FileNotFoundException("Upload session not found");

        var metaJson = await System.IO.File.ReadAllTextAsync(metaPath);
        var meta = JsonSerializer.Deserialize<ChunkUploadMeta>(metaJson, JsonOptions);
        if (meta == null || meta.UploaderId != uploaderId)
        {
            throw new FileNotFoundException("Upload session not found");
        }

        if (!string.Equals(meta.FileName, fileName, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("File name mismatch");
        }

        var tempInfo = new FileInfo(tempFilePath);
        if (tempInfo.Length != meta.TotalSize)
        {
            throw new InvalidOperationException("Upload not complete");
        }

        var storedFileName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var finalPath = Path.Combine(_uploadPath, storedFileName);

        System.IO.File.Move(tempFilePath, finalPath);
        System.IO.File.Delete(metaPath);

        var fileInfo = new FileInfo(finalPath);
        
        var sharedFile = new SharedFile
        {
            FileName = fileName,
            StoredFileName = storedFileName,
            FileSize = fileInfo.Length,
            ContentType = "application/octet-stream", // Could infer from extension
            UploaderId = uploaderId,
            UploadTime = DateTime.UtcNow,
            ParentId = parentId,
            IsFolder = false
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

    public async Task<IEnumerable<FileDto>> GetFilesAsync(int userId, bool isAdmin, int? parentId, string? search = null)
    {
        IQueryable<SharedFile> query = _context.SharedFiles.Include(f => f.Uploader);

        // Filter by ParentId ONLY if not searching. 
        // Usually file system search is recursive or current folder. 
        // Requirement implies "Search by filename", usually global or current tree. 
        // Let's implement: If search is provided, ignore parentId (search all), or maybe search within current?
        // Most LAN tools search globally. Let's search globally if search text is present.
        if (string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(f => f.ParentId == parentId);
        }
        else
        {
            query = query.Where(f => f.FileName.Contains(search));
        }

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

        var files = await query
            .OrderByDescending(f => f.IsFolder) // Folders first
            .ThenByDescending(f => f.UploadTime)
            .ToListAsync();

        return files.Select(f => new FileDto(
            f.Id,
            f.FileName,
            f.FileSize,
            f.ContentType,
            f.Uploader?.Username ?? "Unknown",
            f.UploadTime,
            f.ShareToken,
            f.IsPublic,
            f.IsFolder
        ));
    }

    public async Task<List<SharedFile>> GetFolderPathAsync(int? folderId)
    {
        var path = new List<SharedFile>();
        while (folderId.HasValue)
        {
            var folder = await _context.SharedFiles.FindAsync(folderId);
            if (folder == null || !folder.IsFolder) break;
            path.Insert(0, folder);
            folderId = folder.ParentId;
        }
        return path;
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
