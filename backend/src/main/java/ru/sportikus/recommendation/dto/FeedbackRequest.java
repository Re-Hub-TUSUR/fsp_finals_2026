package ru.sportikus.recommendation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Реакция на рекомендацию: открыл карточку или нажал «Не интересно». */
public record FeedbackRequest(
        @NotNull Long eventId,
        @NotNull Action action,
        UUID requestId,
        @Min(0) Integer position
) {

    public enum Action {
        CLICK,
        DISMISS
    }
}
