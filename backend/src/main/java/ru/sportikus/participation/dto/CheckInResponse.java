package ru.sportikus.participation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CheckInResponse(
        boolean success,
        String status, // SUCCESS, ALREADY_CHECKED_IN, NOT_FOUND, WRONG_EVENT, NOT_CONFIRMED
        String message,
        String ticketCode,
        Instant checkedInAt,
        ParticipationResponse.Participant participant,
        String eventTitle,
        boolean isPaid,
        BigDecimal price
) {
}
