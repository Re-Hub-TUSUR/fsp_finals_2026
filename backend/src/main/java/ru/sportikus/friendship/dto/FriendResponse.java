package ru.sportikus.friendship.dto;

import java.time.Instant;

public record FriendResponse(
        Long userId,
        String fullName,
        String avatarUrl,
        Instant friendsSince
) {}
