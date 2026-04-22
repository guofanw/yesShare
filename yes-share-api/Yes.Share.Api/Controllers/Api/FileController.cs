using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Yes.Share.Api.Dtos;
using Yes.Share.Api.Models;
using Yes.Share.Api.Services;

namespace Yes.Share.Api.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FileController : ControllerBase
{
    private readonly IFileService _fileService;

    public FileController(IFileService fileService)
    {
        _fileService = fileService;
    }

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FileDto>>> GetFiles([FromQuery] int? parentId = null, [FromQuery] string? search = null)
    {
        var files = await _fileService.GetFilesAsync(UserId, IsAdmin, parentId, search);
        return Ok(files);
    }

    [HttpGet("path")]
    public async Task<ActionResult<IEnumerable<SharedFile>>> GetFolderPath([FromQuery] int? folderId = null)
    {
        var path = await _fileService.GetFolderPathAsync(folderId);
        // Simple DTO mapping or cycle fix
        return Ok(path.Select(f => new { f.Id, f.FileName, f.ParentId }));
    }

    [HttpPost("folder")]
    public async Task<ActionResult<FileDto>> CreateFolder([FromBody] CreateFolderRequest request)
    {
        var folder = await _fileService.CreateFolderAsync(request.FolderName, request.ParentId, UserId);
        return Ok(new FileDto(
            folder.Id,
            folder.FileName,
            folder.FileSize,
            folder.ContentType,
            User.Identity?.Name ?? "Unknown",
            folder.UploadTime,
            folder.ShareToken,
            folder.IsPublic,
            folder.IsFolder
        ));
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit] // For large files
    [RequestFormLimits(MultipartBodyLengthLimit = 21474836480)] // 20GB
    public async Task<ActionResult<FileDto>> Upload(IFormFile file, [FromForm] int? parentId = null)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded");

        var sharedFile = await _fileService.UploadFileAsync(file, UserId, parentId);
        return Ok(new FileDto(
            sharedFile.Id,
            sharedFile.FileName,
            sharedFile.FileSize,
            sharedFile.ContentType,
            User.Identity?.Name ?? "Unknown",
            sharedFile.UploadTime,
            sharedFile.ShareToken,
            sharedFile.IsPublic,
            sharedFile.IsFolder
        ));
    }

    [HttpPost("upload/chunk/init")]
    public async Task<ActionResult<ChunkUploadInitResponse>> InitChunk([FromBody] ChunkUploadInitRequest request)
    {
        var uploadId = await _fileService.InitChunkUploadAsync(request, UserId);
        return Ok(new ChunkUploadInitResponse(uploadId));
    }

    [HttpPost("upload/chunk/append/{uploadId}")]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> AppendChunk(string uploadId)
    {
        if (string.IsNullOrEmpty(uploadId))
        {
            return BadRequest("Invalid uploadId");
        }

        try
        {
            await _fileService.AppendChunkAsync(uploadId, Request.Body, UserId);
            return Ok();
        }
        catch (FileNotFoundException ex)
        {
            Console.WriteLine($"[AppendChunk] File not found: {ex.Message}");
            return BadRequest(ex.Message);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (IOException ex)
        {
            Console.WriteLine($"[AppendChunk] IO Exception: {ex.Message}");
            return StatusCode(500, $"File write error: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AppendChunk] Unexpected error: {ex.Message}");
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpGet("upload/chunk/status/{uploadId}")]
    public async Task<ActionResult<ChunkUploadStatusResponse>> GetChunkStatus(string uploadId)
    {
        try
        {
            var status = await _fileService.GetChunkUploadStatusAsync(uploadId, UserId);
            return Ok(status);
        }
        catch (FileNotFoundException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("upload/chunk/cancel/{uploadId}")]
    public async Task<IActionResult> CancelChunk(string uploadId)
    {
        try
        {
            await _fileService.CancelChunkUploadAsync(uploadId, UserId);
            return Ok();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("upload/chunk/finish/{uploadId}")]
    public async Task<ActionResult<FileDto>> FinishChunk(string uploadId, [FromBody] ChunkUploadFinishRequest request)
    {
        var sharedFile = await _fileService.FinishChunkUploadAsync(uploadId, request.FileName, UserId, request.ParentId);
        return Ok(new FileDto(
            sharedFile.Id,
            sharedFile.FileName,
            sharedFile.FileSize,
            sharedFile.ContentType,
            User.Identity?.Name ?? "Unknown",
            sharedFile.UploadTime,
            sharedFile.ShareToken,
            sharedFile.IsPublic,
            sharedFile.IsFolder
        ));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _fileService.DeleteFileAsync(id, UserId, IsAdmin);
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id}/download")]
    [AllowAnonymous] 
    // ...
    public async Task<IActionResult> Download(int id, string? token = null)
    {
        var file = await _fileService.GetFileAsync(id);
        if (file == null) return NotFound();

        // Check permission
        if (!string.IsNullOrEmpty(token) && file.ShareToken == token)
        {
            // Allowed
        }
        else if (User.Identity?.IsAuthenticated == true)
        {
             if (!IsAdmin && file.UploaderId != UserId && !file.IsPublic && 
                 !file.Permissions.Any(p => p.TargetUserId == UserId || p.TargetRole == "User"))
             {
                 return Forbid();
             }
        }
        else if (file.IsPublic)
        {
             // Allowed
        }
        else
        {
            return Unauthorized();
        }

        // Log Download (Fire and forget or async)
        // Ideally use a service method to log. 
        // For now, I'll access DbContext via service if I had a method, but I don't.
        // I should add LogAction to IFileService or create ILogService.
        // I'll skip logging here for brevity unless I update IFileService. 
        // Wait, requirement says "Today's download stats". So I MUST log it.
        // I will add LogDownloadAsync to IFileService.
        
        await _fileService.LogDownloadAsync(id, User.Identity?.IsAuthenticated == true ? UserId : null);

        var stream = _fileService.GetFileStream(file.StoredFileName);
        return File(stream, file.ContentType, file.FileName);
    }
    
    // Download by Token (Public Share Link)
    [HttpGet("share/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> DownloadByToken(string token)
    {
        var file = await _fileService.GetFileByTokenAsync(token);
        if (file == null) return NotFound();

        var stream = _fileService.GetFileStream(file.StoredFileName);
        return File(stream, file.ContentType, file.FileName);
    }

    [HttpGet("{id}/preview")]
    public async Task<IActionResult> Preview(int id)
    {
         var file = await _fileService.GetFileAsync(id);
         if (file == null) return NotFound();

         // Check permission (same as download)
         if (!IsAdmin && file.UploaderId != UserId && !file.IsPublic && 
             !file.Permissions.Any(p => p.TargetUserId == UserId || p.TargetRole == "User"))
         {
             return Forbid();
         }

         try
         {
             var content = await _fileService.GetFileContentAsync(id);
             return Ok(new { content, language = Path.GetExtension(file.FileName).TrimStart('.') });
         }
         catch (Exception ex)
         {
             return BadRequest(ex.Message);
         }
    }
}
