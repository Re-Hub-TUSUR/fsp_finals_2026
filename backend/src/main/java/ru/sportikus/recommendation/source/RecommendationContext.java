package ru.sportikus.recommendation.source;

import ru.sportikus.recommendation.signal.UserSignals;

import java.time.Instant;
import java.util.Map;

/** Параметры одного запроса рекомендаций. */
public record RecommendationContext(
        Long userId,
        double lat,
        double lng,
        double radiusKm,
        int horizonDays,
        Instant now,
        UserSignals signals,
        /** Названия видов спорта, упомянутых в сигналах, — для текста причин. */
        Map<Long, String> sportNames
) {
}
