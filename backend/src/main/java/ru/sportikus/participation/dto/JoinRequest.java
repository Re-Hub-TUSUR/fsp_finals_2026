package ru.sportikus.participation.dto;

import jakarta.validation.constraints.Size;

import java.util.Map;

/** Заявка на участие / запись. Все поля необязательны, кроме тех, что требует мероприятие. */
public record JoinRequest(
        @Size(max = 500) String message,
        /** Ответы на вопросы организатора (ключи — из registrationFields мероприятия). */
        Map<String, Object> answers,
        /** Участник подтверждает, что ознакомился с требованиями (документы, справка, страховка). */
        Boolean acceptedRequirements
) {
}
