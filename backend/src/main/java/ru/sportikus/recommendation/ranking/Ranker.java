package ru.sportikus.recommendation.ranking;

import ru.sportikus.recommendation.source.RecommendationContext;

/**
 * Модель ранжирования. v1 — прозрачная взвешенная формула ({@link WeightedRanker}).
 * Следующая версия (learning-to-rank, обученная на recommendation_log) подключается
 * как ещё одна реализация; имя модели пишется в лог показов для сравнения A/B.
 */
public interface Ranker {

    String model();

    Scored score(CandidateView candidate, RecommendationContext ctx);
}
