namespace Yes.Share.Api.Dtos;

public record DashboardStats(
    int OnlineUsers,
    string StorageUsage, // "10.5 GB / 100 GB"
    long StorageUsedBytes,
    long StorageTotalBytes,
    TodayStats TodayStats,
    IEnumerable<LogDto> RecentLogs
);

public record TodayStats(int UploadCount, string UploadSize, int DownloadCount, string DownloadSize);
public record LogDto(string Action, string User, string Details, DateTime Time);
