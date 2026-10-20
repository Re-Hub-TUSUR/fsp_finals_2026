package ru.sportikus.security;

/** Роли пользователей: значения колонки users.role и authority в Spring Security. */
public final class Roles {

    public static final String USER = "ROLE_USER";
    public static final String ORGANIZER = "ROLE_ORGANIZER";
    public static final String ADMIN = "ROLE_ADMIN";

    private Roles() {
    }
}
