namespace Yes.Share.Api.Dtos;

public record FileDto(
    int Id, 
    string FileName, 
    long FileSize, 
    string ContentType, 
    string UploaderName, 
    DateTime UploadTime, 
    string ShareLink,
    bool IsPublic
);

public record ChunkUploadInitRequest(string FileName, long TotalSize);
public record ChunkUploadInitResponse(string UploadId); // We can use Guid as UploadId, which might map to a temp file or DB entry
public record ChunkUploadFinishRequest(string UploadId, string FileName); // Confirm finish

public record UpdateFilePermissionRequest(bool IsPublic);
