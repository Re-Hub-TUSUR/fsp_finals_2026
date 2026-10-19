package ru.sportikus.friendship.dto;

public record FriendSearchResponse(
        Long userId,
        String fullName,
        String email,
        String avatarUrl,
        FriendshipState state,
        /** Не null — найден аккаунт организации: с ней дружбы нет, на неё можно подписаться. */
        Long organizationId
) {
}
