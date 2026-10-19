package ru.sportikus.recommendation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import ru.sportikus.event.dto.EventResponse;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Персональная выдача. requestId связывает показы с последующими кликами и записями в логе. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RecommendationResponse(
        UUID requestId,
        String model,
        LocationInfo location,
        /** О вкусах пользователя ничего не известно — показываем популярное рядом. */
        boolean coldStart,
        /** Не удалось определить местоположение: нужен город в профиле или геолокация. */
        boolean needsLocation,
        List<Item> items,
        Instant generatedAt
) {

    /** Откуда взята точка: GEO — геолокация устройства, HOME — точка дома, CITY — центр домашнего города. */
    public record LocationInfo(double lat, double lng, String source, String cityName, int radiusKm) {
    }

    public record Item(
            EventResponse event,
            double score,
            List<Reason> reasons,
            /** Из каких источников пришёл кандидат (INTEREST, POPULAR, ORGANIZER, SOON). */
            List<String> sources,
            /** Вклад каждого признака в итоговый балл — для прозрачности и отладки весов. */
            Map<String, Double> breakdown
    ) {
    }

    public record Reason(String code, String text) {
    }
}
