package ru.sportikus.recommendation.source;

import java.util.List;

/**
 * Источник кандидатов. Каждый источник отбирает не больше limit событий своим способом,
 * поэтому даже в плотном городе (десятки тысяч событий в радиусе) на ранжирование
 * попадает ограниченное число кандидатов. Новый источник — новый бин, движок не меняется.
 */
public interface CandidateSource {

    String name();

    List<Candidate> fetch(RecommendationContext ctx, int limit);
}
