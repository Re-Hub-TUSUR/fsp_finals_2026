package ru.sportikus.participation.dto;

import jakarta.validation.constraints.NotBlank;

public record CheckInRequest(
        @NotBlank(message = "Код билета обязателен")
        String ticketCode
) {
}
