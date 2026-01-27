using Yes.Share.Api.Dtos;
using Yes.Share.Api.Models;

namespace Yes.Share.Api.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<User> RegisterAsync(RegisterRequest request);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
}
