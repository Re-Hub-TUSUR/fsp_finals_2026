package ru.sportikus.participation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;

import java.time.Instant;
import java.util.Map;

/** Заявка/участие. Для организатора содержит данные участника, для самого участника — мероприятие. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ParticipationResponse(
        Long id,
        ParticipationStatus status,
        String message,
        Map<String, Object> answers,
        String decisionComment,
        Instant createdAt,
        Instant decidedAt,
        Participant user,
        EventResponse event
) {

    public record Participant(Long id, String fullName, String avatarUrl) {
    }

    public static ParticipationResponse withUser(Participation p) {
        return new ParticipationResponse(p.getId(), p.getStatus(), p.getMessage(), p.getAnswers(),
                p.getDecisionComment(), p.getCreatedAt(), p.getDecidedAt(),
                new Participant(p.getUser().getId(), p.getUser().getFullName(), p.getUser().getAvatarUrl()), null);
    }

    public static ParticipationResponse withEvent(Participation p, EventResponse event) {
        return new ParticipationResponse(p.getId(), p.getStatus(), p.getMessage(), p.getAnswers(),
                p.getDecisionComment(), p.getCreatedAt(), p.getDecidedAt(), null, event);
    }
}
