using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.Filters;
using Yes.Share.Api.Data;

namespace Yes.Share.Api.Filters;

public class UserActivityFilter : IAsyncActionFilter
{
    private readonly IServiceScopeFactory _scopeFactory;

    public UserActivityFilter(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var resultContext = await next();

        if (context.HttpContext.User.Identity?.IsAuthenticated == true)
        {
            var userIdStr = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdStr, out int userId))
            {
                // Fire and forget update (or awaited, but usually fast)
                // Need a scope since DbContext is Scoped
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var user = await db.Users.FindAsync(userId);
                    if (user != null)
                    {
                        user.LastActive = DateTime.UtcNow;
                        await db.SaveChangesAsync();
                    }
                }
                catch { /* Ignore logging errors */ }
            }
        }
    }
}
