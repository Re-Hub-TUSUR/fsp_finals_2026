package ru.sportikus.auth;

public record AuthResponse(String token, UserDto user) {
}
