package ru.sportikus.recommendation.source;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import ru.sportikus.event.repository.EventGeoRepository;
import ru.sportikus.recommendation.signal.UserSignals;

import java.util.List;

/**
 * Общая часть запросов к кандидатам: геофильтр по GiST-индексу и жёсткие ограничения
 * (опубликовано, скоро, регистрация открыта, не своё, без активной заявки, не скрыто,
 * подходит по цене и возрасту). Источник добавляет своё условие, сортировку и join.
 */
@Component
@RequiredArgsConstructor
public class CandidateQuery {

    private final NamedParameterJdbcTemplate jdbc;

    public List<Candidate> run(String source, RecommendationContext ctx, String join, String condition,
                               String orderBy, MapSqlParameterSource extra, int limit) {
        UserSignals s = ctx.signals();
        StringBuilder sql = new StringBuilder()
                .append("SELECT e.id, ST_Distance(e.geog, ").append(EventGeoRepository.POINT).append(") / 1000.0 AS dist_km")
                .append(" FROM events e ").append(join == null ? "" : join)
                .append(" WHERE e.status = 'PUBLISHED'")
                .append(" AND e.start_time > :now AND e.start_time < :horizon")
                .append(" AND COALESCE(e.registration_deadline, e.start_time) > :now")
                .append(" AND ST_DWithin(e.geog, ").append(EventGeoRepository.POINT).append(", :radius)")
                .append(" AND (e.organizer_user_id IS NULL OR e.organizer_user_id <> :userId)")
                .append(" AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = e.organizer_org_id AND o.owner_user_id = :userId)")
                .append(" AND NOT EXISTS (SELECT 1 FROM participations p WHERE p.event_id = e.id AND p.user_id = :userId")
                .append(" AND p.status IN ('PENDING', 'CONFIRMED', 'REJECTED'))")
                .append(" AND NOT EXISTS (SELECT 1 FROM event_feedback f WHERE f.event_id = e.id AND f.user_id = :userId)");

        MapSqlParameterSource p = extra == null ? new MapSqlParameterSource() : extra;
        p.addValue("lat", ctx.lat()).addValue("lng", ctx.lng())
                .addValue("radius", ctx.radiusKm() * 1000)
                .addValue("userId", ctx.userId())
                .addValue("now", java.sql.Timestamp.from(ctx.now()))
                .addValue("horizon", java.sql.Timestamp.from(ctx.now().plus(java.time.Duration.ofDays(ctx.horizonDays()))))
                .addValue("limit", limit);
        if (s.maxPrice() != null) {
            sql.append(" AND (e.price IS NULL OR e.price <= :maxPrice)");
            p.addValue("maxPrice", s.maxPrice());
        }
        if (s.age() != null) {
            sql.append(" AND (e.min_age IS NULL OR e.min_age <= :age) AND (e.max_age IS NULL OR e.max_age >= :age)");
            p.addValue("age", s.age());
        }
        if (condition != null) {
            sql.append(" AND (").append(condition).append(")");
        }
        sql.append(" ORDER BY ").append(orderBy).append(" LIMIT :limit");

        return jdbc.query(sql.toString(), p, (rs, i) -> new Candidate(rs.getLong("id"), rs.getDouble("dist_km"), source));
    }
}
