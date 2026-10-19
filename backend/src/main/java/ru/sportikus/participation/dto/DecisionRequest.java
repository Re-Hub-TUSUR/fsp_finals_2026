package ru.sportikus.participation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ru.sportikus.participation.model.ParticipationStatus;

/** Решение организатора по заявке: CONFIRMED или REJECTED. */
public record DecisionRequest(
        @NotNull ParticipationStatus decision,
        @Size(max = 500) String comment
) {
}
