package ru.sportikus.notification.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record InviteFriendsRequest(
        @NotEmpty(message = "Выберите хотя бы одного друга")
        List<Long> friendIds,
        String message
) {
}
