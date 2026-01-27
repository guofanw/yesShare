using Microsoft.AspNetCore.Mvc;
using Yes.Share.Api.Dtos;
using Yes.Share.Api.Models;
using Yes.Share.Api.Services;

namespace Yes.Share.Api.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        if (response == null)
        {
            return Unauthorized("Invalid username or password");
        }
        return Ok(response);
    }

    [HttpPost("register")]
    public async Task<ActionResult<User>> Register(RegisterRequest request)
    {
        try
        {
            // Simple logic: If no users exist, first one is Admin? Or just allow registration.
            // Requirement says Admin manages users, but maybe we need a way to create the first one.
            // Program.cs creates default 'admin'. So registration is for normal users or by admin.
            // For now, I'll allow open registration for 'User' role for testing convenience, 
            // or maybe restrict it. Let's allow open registration of 'User' role.
            
            if (request.Role == "Admin")
            {
                // Only allow creating Admin if authorized as Admin? 
                // For simplicity in this LAN tool context, let's just restrict it or ignore the request role.
                return BadRequest("Cannot register as Admin publicly.");
            }

            var user = await _authService.RegisterAsync(request);
            return Ok(new { user.Id, user.Username, user.Role, user.CreatedAt });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
