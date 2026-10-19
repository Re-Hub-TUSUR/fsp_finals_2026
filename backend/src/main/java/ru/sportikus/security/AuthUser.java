package ru.sportikus.security;

/** Аутентифицированный пользователь, извлечённый из JWT. */
public record AuthUser(Long id, String email, String role) {

    public boolean isAdmin() {
        return "ROLE_ADMIN".equals(role);
    }

    public boolean isOrganizer() {
        return "ROLE_ORGANIZER".equals(role);
    }
}
