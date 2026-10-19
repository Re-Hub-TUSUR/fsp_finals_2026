package ru.sportikus.recommendation.source;

/** Кандидат в выдачу: событие, расстояние до пользователя и источник, который его нашёл. */
public record Candidate(long eventId, double distanceKm, String source) {
}
