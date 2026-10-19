package ru.sportikus.recommendation.ranking;

import ru.sportikus.recommendation.dto.RecommendationResponse.Reason;

import java.util.List;
import java.util.Map;

public record Scored(CandidateView candidate, double score, List<Reason> reasons, Map<String, Double> breakdown) {

    public long sportId() {
        return candidate.event().getSport().getId();
    }
}
