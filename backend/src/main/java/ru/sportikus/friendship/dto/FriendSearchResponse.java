package ru.sportikus.friendship.dto;

public record FriendSearchResponse(
        Long userId,
        String fullName,
        String email,
        String avatarUrl,
        FriendshipState state
) {
}
