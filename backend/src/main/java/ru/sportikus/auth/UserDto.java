package ru.sportikus.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Профиль пользователя; для организатора включает данные его организации. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserDto(
        Long id,
        String email,
        String fullName,
        String role,
        String avatarUrl,
        Long organizationId,
        String organizationName,
        String orgStatus,
        String orgRejectReason
) {
}
