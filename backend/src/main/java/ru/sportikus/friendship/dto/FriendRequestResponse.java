package ru.sportikus.friendship.dto;

import java.time.Instant;

public record FriendRequestResponse(Long userId, String fullName, String avatarUrl, Instant createdAt) {
}
