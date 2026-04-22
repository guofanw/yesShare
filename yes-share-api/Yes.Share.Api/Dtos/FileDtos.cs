namespace Yes.Share.Api.Dtos;

public record FileDto(
    int Id, 
    string FileName, 
    long FileSize, 
    string ContentType, 
    string UploaderName, 
    DateTime UploadTime, 
    string ShareLink,
    bool IsPublic,
    bool IsFolder
);

public record CreateFolderRequest(string FolderName, int? ParentId);
public record ChunkUploadInitRequest(string FileName, long TotalSize, int? ParentId);
public record ChunkUploadInitResponse(string UploadId);
public record ChunkUploadFinishRequest(string UploadId, string FileName, int? ParentId);
public record ChunkUploadStatusResponse(string UploadId, string FileName, long TotalSize, long ReceivedSize, int? ParentId, bool IsFinished);

public record UpdateFilePermissionRequest(bool IsPublic);
