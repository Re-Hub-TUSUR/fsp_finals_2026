package ru.sportikus.notification.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record InviteFriendsRequest(
        @NotEmpty(message = "Выберите хотя бы одного друга")
        @Size(max = 50, message = "За один раз можно пригласить не больше 50 друзей")
        List<Long> friendIds,
        @Size(max = 300, message = "Сообщение к приглашению — не длиннее 300 символов")
        String message
) {
}
