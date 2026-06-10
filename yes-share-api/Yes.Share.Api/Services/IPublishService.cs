using Yes.Share.Api.Dtos;
using Yes.Share.Api.Models;

namespace Yes.Share.Api.Services;

public interface IPublishService
{
    Task<PublishPostDto> CreatePostAsync(CreatePublishPostRequest request, int userId, string userName);
    Task<PublishPostPageDto> GetPostsAsync(int page, int pageSize, string? keyword);
    Task<PublishPost?> GetPostAsync(int id);
    Stream GetImageStream(string storedFileName);
}
