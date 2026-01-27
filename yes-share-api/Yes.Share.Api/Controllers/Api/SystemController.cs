using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Yes.Share.Api.Data;
using Yes.Share.Api.Dtos;

namespace Yes.Share.Api.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")] // Only Admin
public class SystemController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly string _uploadPath;

    public SystemController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _uploadPath = configuration["FileStorage:UploadPath"] ?? "Uploads";
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStats>> GetDashboardStats()
    {
        // Online Users (Last 30 mins)
        var threshold = DateTime.UtcNow.AddMinutes(-30);
        var onlineUsers = await _context.Users.CountAsync(u => u.LastActive >= threshold);

        // Storage Usage
        var driveInfo = new DriveInfo(Path.GetPathRoot(Path.GetFullPath(_uploadPath)) ?? "C");
        var totalSpace = driveInfo.TotalSize;
        var freeSpace = driveInfo.AvailableFreeSpace;
        var usedSpace = totalSpace - freeSpace;
        var storageUsage = $"{FormatSize(usedSpace)} / {FormatSize(totalSpace)}";

        // Today's Stats
        var today = DateTime.UtcNow.Date;
        var todayLogs = await _context.SystemLogs
            .Where(l => l.Timestamp >= today)
            .ToListAsync();

        var uploadLogs = todayLogs.Where(l => l.Action == "Upload").ToList();
        var downloadLogs = todayLogs.Where(l => l.Action == "Download").ToList();

        var todayStats = new TodayStats(
            uploadLogs.Count,
            FormatSize(uploadLogs.Sum(l => l.DataSize)),
            downloadLogs.Count,
            FormatSize(downloadLogs.Sum(l => l.DataSize))
        );

        // Recent Logs
        var recentLogs = await _context.SystemLogs
            .OrderByDescending(l => l.Timestamp)
            .Take(20)
            .Select(l => new LogDto(
                l.Action,
                l.UserName ?? (l.UserId.HasValue ? l.UserId.ToString() : "System"),
                l.Details ?? "",
                l.Timestamp
            ))
            .ToListAsync();

        return Ok(new DashboardStats(
            onlineUsers,
            storageUsage,
            usedSpace,
            totalSpace,
            todayStats,
            recentLogs
        ));
    }

    private string FormatSize(long bytes)
    {
        string[] sizes = { "B", "KB", "MB", "GB", "TB" };
        double len = bytes;
        int order = 0;
        while (len >= 1024 && order < sizes.Length - 1)
        {
            order++;
            len = len / 1024;
        }
        return $"{len:0.##} {sizes[order]}";
    }
}
