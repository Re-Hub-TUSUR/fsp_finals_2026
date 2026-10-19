package ru.sportikus.participation;

import ru.sportikus.participation.model.ParticipationStatus;

/**
 * Статус участия изменился (запись, отмена, решение организатора).
 * Слушатели — сигналы рекомендаций и лог; публикуется внутри транзакции, обрабатывается после коммита.
 */
public record ParticipationChangedEvent(Long userId, Long eventId, ParticipationStatus previous, ParticipationStatus current) {
}
