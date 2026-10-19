package ru.sportikus.recommendation.signal;

import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.preference.model.PreferredTime;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Всё, что известно о вкусах пользователя к моменту запроса. */
public record UserSignals(
        Long userId,
        /** Явные интересы (виды спорта). */
        Set<Long> interests,
        /** Похожие виды спорта: sportId → (сходство, через какой вид спорта пользователя). */
        Map<Long, Similar> similarSports,
        /** Накопленные сигналы с учётом затухания. */
        Map<AffinityKind, Map<Long, Double>> affinities,
        SkillLevel skillLevel,
        List<PreferredTime> preferredTimes,
        Integer age,
        BigDecimal maxPrice,
        Integer maxDistanceKm
) {

    public record Similar(double score, long viaSportId) {
    }

    public double affinity(AffinityKind kind, Long targetId) {
        if (targetId == null) {
            return 0;
        }
        return affinities.getOrDefault(kind, Map.of()).getOrDefault(targetId, 0.0);
    }

    /** Ничего не знаем о вкусах — показываем популярное и ближайшее. */
    public boolean isColdStart() {
        return interests.isEmpty() && affinities.getOrDefault(AffinityKind.SPORT, Map.of()).values().stream()
                .noneMatch(v -> v > 0.05);
    }

    public static Map<AffinityKind, Map<Long, Double>> emptyAffinities() {
        return new EnumMap<>(AffinityKind.class);
    }
}
