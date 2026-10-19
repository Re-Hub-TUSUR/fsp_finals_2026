package ru.sportikus.recommendation;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** Настройки рекомендаций: веса ранжирования, лимиты кандидатов, кэш и фоновые задачи (application.yml → recommendations.*). */
@Component
@ConfigurationProperties(prefix = "recommendations")
@Getter
@Setter
public class RecommendationProperties {

    /** Радиус по умолчанию, если пользователь не задал свой. */
    private int defaultRadiusKm = 25;
    private int maxRadiusKm = 300;
    /** Рекомендуем события, начинающиеся не позже чем через N дней. */
    private int horizonDays = 30;
    /** Сколько кандидатов берёт каждый источник (защита от плотных городов). */
    private int candidatesPerSource = 300;
    private int defaultLimit = 20;
    private int maxLimit = 50;
    private Duration cacheTtl = Duration.ofMinutes(2);
    private int cacheMaxEntries = 50_000;
    /** Не больше N событий одного вида спорта подряд в выдаче. */
    private int maxSameSportInRow = 2;
    /** «Похожие виды спорта»: минимальное косинусное сходство и минимум людей, у которых встречаются оба вида. */
    private double similarityMinScore = 0.2;
    private int similarityMinCooccurrence = 2;
    /** Период полураспада накопленных сигналов. */
    private double affinityHalfLifeDays = 90;

    private Weights weights = new Weights();
    private Jobs jobs = new Jobs();

    @Getter
    @Setter
    public static class Weights {
        private double interest = 0.35;
        private double distance = 0.20;
        private double affinity = 0.15;
        private double urgency = 0.10;
        private double skill = 0.08;
        private double social = 0.07;
        private double organizer = 0.05;
        private double time = 0.05;
        /** Штраф за виды спорта, от которых пользователь отказывался. */
        private double dislikePenalty = 0.30;
    }

    @Getter
    @Setter
    public static class Jobs {
        private boolean enabled = true;
        /** Как часто пересчитывать популярность событий. */
        private Duration popularityRefresh = Duration.ofMinutes(5);
        /** Ночной пересчёт «похожих видов спорта» и полная пересборка сигналов. */
        private String nightlyCron = "0 30 3 * * *";
    }
}
