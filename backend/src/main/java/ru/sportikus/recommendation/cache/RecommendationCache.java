package ru.sportikus.recommendation.cache;

import ru.sportikus.recommendation.dto.RecommendationResponse;

import java.util.Optional;

/**
 * Кэш готовой выдачи на пользователя. Сейчас реализация в памяти процесса;
 * при нескольких экземплярах бэкенда подставляется реализация на Redis без изменений в движке.
 */
public interface RecommendationCache {

    Optional<RecommendationResponse> get(String key);

    void put(String key, Long userId, RecommendationResponse value);

    /** Сбросить всё по пользователю: записался, отказался, поменял интересы. */
    void evictUser(Long userId);
}
