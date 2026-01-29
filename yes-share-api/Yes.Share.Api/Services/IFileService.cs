using Yes.Share.Api.Dtos;
using Yes.Share.Api.Models;

namespace Yes.Share.Api.Services;

public interface IFileService
{
    Task<SharedFile> UploadFileAsync(IFormFile file, int uploaderId, int? parentId);
    Task<SharedFile> CreateFolderAsync(string folderName, int? parentId, int uploaderId);
    Task<string> InitChunkUploadAsync(ChunkUploadInitRequest request, int uploaderId);
    Task AppendChunkAsync(string uploadId, IFormFile chunk);
    Task<SharedFile> FinishChunkUploadAsync(string uploadId, string fileName, int uploaderId, int? parentId);
    
    Task<IEnumerable<FileDto>> GetFilesAsync(int userId, bool isAdmin, int? parentId, string? search = null);
    Task<SharedFile?> GetFileAsync(int fileId);
    Task<SharedFile?> GetFileByTokenAsync(string token);
    Task<List<SharedFile>> GetFolderPathAsync(int? folderId);
    
    Task DeleteFileAsync(int fileId, int userId, bool isAdmin);
    Task<string> GetFileContentAsync(int fileId);
    Stream GetFileStream(string storedFileName);
    Task LogDownloadAsync(int fileId, int? userId);
}
