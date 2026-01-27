namespace Yes.Share.Api.Dtos;

public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, string Username, string Role, int UserId);
public record RegisterRequest(string Username, string Password, string Role = "User"); // Basic reg for init
