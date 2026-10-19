package ru.sportikus.recommendation.ranking;

import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.Event;

import java.util.Set;

/** Кандидат со всем, что нужно для ранжирования: событие, его представление, расстояние, популярность. */
public record CandidateView(
        Event event,
        EventResponse response,
        double distanceKm,
        double popularity,
        Set<String> sources
) {
}
