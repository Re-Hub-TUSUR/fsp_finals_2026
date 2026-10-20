package ru.sportikus.security;

/** Аутентифицированный пользователь, извлечённый из JWT. */
public record AuthUser(Long id, String email, String role) {

    public boolean isAdmin() {
        return Roles.ADMIN.equals(role);
    }

    public boolean isOrganizer() {
        return Roles.ORGANIZER.equals(role);
    }
}
