package ru.sportikus.recommendation.source;

import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;
import ru.sportikus.event.repository.EventGeoRepository;
import ru.sportikus.recommendation.signal.AffinityKind;
import ru.sportikus.recommendation.signal.UserSignals;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Стандартные источники кандидатов. */
public final class Sources {

    private Sources() {
    }

    private static final String NEAREST = "e.geog <-> " + EventGeoRepository.POINT;

    /** Виды спорта из интересов, похожие на них и те, куда пользователь уже ходит. Ближайшие. */
    @Component
    @Order(1)
    @RequiredArgsConstructor
    public static class InterestNearby implements CandidateSource {
        private final CandidateQuery query;

        @Override
        public String name() {
            return "INTEREST";
        }

        @Override
        public List<Candidate> fetch(RecommendationContext ctx, int limit) {
            UserSignals s = ctx.signals();
            Set<Long> sports = new LinkedHashSet<>(s.interests());
            sports.addAll(s.similarSports().keySet());
            s.affinities().getOrDefault(AffinityKind.SPORT, Map.of()).forEach((sport, score) -> {
                if (score > 0.3) {
                    sports.add(sport);
                }
            });
            if (sports.isEmpty()) {
                return List.of();
            }
            return query.run(name(), ctx, null, "e.sport_id IN (:sports)", NEAREST,
                    new MapSqlParameterSource("sports", sports), limit);
        }
    }

    /** Самое популярное рядом (предрассчитанная популярность) — холодный старт и «что сейчас собирает людей». */
    @Component
    @Order(2)
    @RequiredArgsConstructor
    public static class PopularNearby implements CandidateSource {
        private final CandidateQuery query;

        @Override
        public String name() {
            return "POPULAR";
        }

        @Override
        public List<Candidate> fetch(RecommendationContext ctx, int limit) {
            return query.run(name(), ctx, "JOIN mv_event_popularity mp ON mp.event_id = e.id", "mp.score > 0",
                    "mp.score DESC", null, limit);
        }
    }

    /** Организаторы и клубы, к которым пользователь уже ходил. */
    @Component
    @Order(3)
    @RequiredArgsConstructor
    public static class FamiliarOrganizers implements CandidateSource {
        private final CandidateQuery query;

        @Override
        public String name() {
            return "ORGANIZER";
        }

        @Override
        public List<Candidate> fetch(RecommendationContext ctx, int limit) {
            List<Long> orgs = positive(ctx.signals(), AffinityKind.ORGANIZATION);
            List<Long> users = positive(ctx.signals(), AffinityKind.ORGANIZER_USER);
            if (orgs.isEmpty() && users.isEmpty()) {
                return List.of();
            }
            MapSqlParameterSource p = new MapSqlParameterSource()
                    .addValue("orgs", orgs.isEmpty() ? List.of(-1L) : orgs)
                    .addValue("users", users.isEmpty() ? List.of(-1L) : users);
            return query.run(name(), ctx, null, "e.organizer_org_id IN (:orgs) OR e.organizer_user_id IN (:users)",
                    "e.start_time", p, limit);
        }

        private static List<Long> positive(UserSignals s, AffinityKind kind) {
            return s.affinities().getOrDefault(kind, Map.of()).entrySet().stream()
                    .filter(e -> e.getValue() > 0.2).map(Map.Entry::getKey).toList();
        }
    }

    /** Ближайшее по времени рядом — разведка за пределами привычного и запасной вариант. */
    @Component
    @Order(4)
    @RequiredArgsConstructor
    public static class SoonNearby implements CandidateSource {
        private final CandidateQuery query;

        @Override
        public String name() {
            return "SOON";
        }

        @Override
        public List<Candidate> fetch(RecommendationContext ctx, int limit) {
            return query.run(name(), ctx, null, null, "e.start_time", null, Math.max(20, limit / 3));
        }
    }
}
