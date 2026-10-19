package ru.sportikus.participation.dto;

import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;

import java.time.Instant;

/** Краткое состояние участия текущего пользователя в мероприятии. */
public record ParticipationBrief(
        Long id,
        ParticipationStatus status,
        String message,
        String decisionComment,
        Instant createdAt,
        String ticketCode,
        Boolean checkedIn,
        Instant checkedInAt
) {

    public static ParticipationBrief from(Participation p) {
        return new ParticipationBrief(
                p.getId(), p.getStatus(), p.getMessage(), p.getDecisionComment(), p.getCreatedAt(),
                p.getTicketCode(), p.isCheckedIn(), p.getCheckedInAt()
        );
    }
}
