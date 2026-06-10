using System.ComponentModel.DataAnnotations;

namespace Yes.Share.Api.Dtos;

public class CreatePublishPostRequest
{
    [MaxLength(2000)]
    public string? Content { get; set; }

    [Required]
    public string TextFormat { get; set; } = "auto";

    public string? CodeLanguage { get; set; }
    public IFormFile? Image { get; set; }
}

public record PublishPostDto(
    int Id,
    string? Content,
    string TextFormat,
    string? CodeLanguage,
    string? ImageUrl,
    string? ImageFileName,
    string UserName,
    DateTime CreatedAt
);

public record PublishPostPageDto(
    IReadOnlyList<PublishPostDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    PublishSummaryDto Summary
);

public record PublishSummaryDto(
    int TotalCount,
    DateTime? LatestPublishTime,
    int CodePostCount,
    int ImagePostCount
);
