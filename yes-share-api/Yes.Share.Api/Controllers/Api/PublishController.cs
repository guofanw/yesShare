using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Yes.Share.Api.Dtos;
using Yes.Share.Api.Services;

namespace Yes.Share.Api.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PublishController : ControllerBase
{
    private readonly IPublishService _publishService;

    public PublishController(IPublishService publishService)
    {
        _publishService = publishService;
    }

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    private string UserName => User.Identity?.Name ?? "Unknown";

    [HttpPost]
    [RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)]
    public async Task<ActionResult<PublishPostDto>> Create([FromForm] CreatePublishPostRequest request)
    {
        try
        {
            var result = await _publishService.CreatePostAsync(request, UserId, UserName);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet]
    public async Task<ActionResult<PublishPostPageDto>> GetList([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? keyword = null)
    {
        var result = await _publishService.GetPostsAsync(page, pageSize, keyword);
        return Ok(result);
    }

    [HttpGet("{id}/image")]
    [AllowAnonymous]
    public async Task<IActionResult> GetImage(int id)
    {
        var post = await _publishService.GetPostAsync(id);
        if (post == null || string.IsNullOrWhiteSpace(post.ImageStoredFileName))
        {
            return NotFound();
        }

        if (User.Identity?.IsAuthenticated != true)
        {
            return Unauthorized();
        }

        var stream = _publishService.GetImageStream(post.ImageStoredFileName);
        return File(stream, post.ImageContentType ?? "application/octet-stream", post.ImageFileName);
    }
}
