package ru.sportikus.recommendation.signal;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Хранилище сигналов рекомендаций: накопленный интерес, похожие виды спорта, популярность. */
@Repository
@RequiredArgsConstructor
public class SignalRepository {

    /** Множитель затухания: 0.5 ^ (возраст в днях / период полураспада). */
    private static final String DECAY = "power(0.5, EXTRACT(EPOCH FROM (now() - %s)) / 86400.0 / :hl)";

    private final NamedParameterJdbcTemplate jdbc;

    public record EventFacts(long sportId, Long templateId, Long organizationId, Long organizerUserId,
                             Instant startTime, String timeZone) {
    }

    public Map<AffinityKind, Map<Long, Double>> affinities(Long userId, double halfLifeDays) {
        Map<AffinityKind, Map<Long, Double>> result = UserSignals.emptyAffinities();
        jdbc.query("SELECT kind, target_id, score * " + DECAY.formatted("updated_at") + " AS s"
                        + " FROM user_affinities WHERE user_id = :u",
                new MapSqlParameterSource("u", userId).addValue("hl", halfLifeDays),
                rs -> {
                    result.computeIfAbsent(AffinityKind.valueOf(rs.getString("kind")), k -> new HashMap<>())
                            .put(rs.getLong("target_id"), rs.getDouble("s"));
                });
        return result;
    }

    /** Похожие виды спорта по совместной встречаемости у пользователей (mv_sport_similarity). */
    public List<Map<String, Object>> similarSports(Collection<Long> sportIds, double minScore, int minCooccurrence) {
        if (sportIds.isEmpty()) {
            return List.of();
        }
        return jdbc.queryForList("SELECT sport_id, similar_sport_id, score FROM mv_sport_similarity"
                        + " WHERE sport_id IN (:ids) AND score >= :min AND co >= :minCo",
                new MapSqlParameterSource("ids", sportIds).addValue("min", minScore).addValue("minCo", minCooccurrence));
    }

    /** Добавляет вес к сигналу, предварительно «состарив» накопленное значение. */
    public void addAffinity(Long userId, AffinityKind kind, long targetId, double delta, double halfLifeDays) {
        jdbc.update("""
                INSERT INTO user_affinities (user_id, kind, target_id, score, updated_at)
                VALUES (:u, :k, :t, :d, now())
                ON CONFLICT (user_id, kind, target_id) DO UPDATE
                SET score = user_affinities.score * %s + EXCLUDED.score, updated_at = now()
                """.formatted(DECAY.formatted("user_affinities.updated_at")),
                new MapSqlParameterSource("u", userId).addValue("k", kind.name()).addValue("t", targetId)
                        .addValue("d", delta).addValue("hl", halfLifeDays));
    }

    public Optional<EventFacts> eventFacts(Long eventId) {
        List<EventFacts> rows = jdbc.query("""
                SELECT sport_id, template_id, organizer_org_id, organizer_user_id, start_time, time_zone
                FROM events WHERE id = :id
                """, new MapSqlParameterSource("id", eventId), (rs, i) -> new EventFacts(
                rs.getLong("sport_id"),
                (Long) rs.getObject("template_id"),
                (Long) rs.getObject("organizer_org_id"),
                (Long) rs.getObject("organizer_user_id"),
                rs.getTimestamp("start_time").toInstant(),
                rs.getString("time_zone")));
        return rows.stream().findFirst();
    }

    public Map<Long, Double> popularity(Collection<Long> eventIds) {
        Map<Long, Double> result = new HashMap<>();
        if (eventIds.isEmpty()) {
            return result;
        }
        jdbc.query("SELECT event_id, score FROM mv_event_popularity WHERE event_id IN (:ids)",
                new MapSqlParameterSource("ids", eventIds),
                rs -> {
                    result.put(rs.getLong("event_id"), rs.getDouble("score"));
                });
        return result;
    }

    public void dismiss(Long userId, Long eventId) {
        jdbc.update("INSERT INTO event_feedback (user_id, event_id, kind) VALUES (:u, :e, 'DISMISSED')"
                + " ON CONFLICT (user_id, event_id) DO NOTHING", new MapSqlParameterSource("u", userId).addValue("e", eventId));
    }

    public boolean undismiss(Long userId, Long eventId) {
        return jdbc.update("DELETE FROM event_feedback WHERE user_id = :u AND event_id = :e",
                new MapSqlParameterSource("u", userId).addValue("e", eventId)) > 0;
    }

    // ------------------------------------------------------------- офлайн-пересчёты

    public void refreshPopularity() {
        jdbc.getJdbcTemplate().execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_event_popularity");
    }

    public void refreshSportSimilarity() {
        jdbc.getJdbcTemplate().execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sport_similarity");
    }

    /**
     * Полная пересборка сигналов из истории (записи, отмены, «Не интересно», клики) с затуханием.
     * Веса совпадают с инкрементальными обновлениями: запись +1, отмена −0.5, «Не интересно» −0.5,
     * клик +0.15; доли по сущностям — {@link AffinityKind#share()}. Время суток считается
     * в часовом поясе места проведения.
     */
    public int rebuildAffinities(double halfLifeDays) {
        jdbc.getJdbcTemplate().update("DELETE FROM user_affinities");
        String hour = "EXTRACT(HOUR FROM e.start_time AT TIME ZONE COALESCE(e.time_zone, 'Europe/Moscow'))";
        String isoDow = "EXTRACT(ISODOW FROM e.start_time AT TIME ZONE COALESCE(e.time_zone, 'Europe/Moscow'))";
        String sql = """
                WITH acts AS (
                    SELECT p.user_id, p.event_id, TRUE AS attended,
                           CASE p.status WHEN 'CANCELLED' THEN 0.5 ELSE 1.0 END AS w, p.created_at AS at
                    FROM participations p
                    UNION ALL
                    SELECT f.user_id, f.event_id, FALSE, -0.5, f.created_at FROM event_feedback f
                    UNION ALL
                    SELECT l.user_id, l.event_id, FALSE, 0.15, l.created_at FROM recommendation_log l WHERE l.action = 'CLICK'
                ),
                decayed AS (
                    SELECT a.user_id, a.attended, e.sport_id, e.template_id, e.organizer_org_id, e.organizer_user_id,
                           a.w * %s AS dw,
                           CASE WHEN %s >= 5 AND %s < 11 THEN 0 WHEN %s >= 11 AND %s < 17 THEN 1
                                WHEN %s >= 17 AND %s < 23 THEN 2 ELSE 3 END AS slot,
                           %s IN (6, 7) AS weekend
                    FROM acts a JOIN events e ON e.id = a.event_id
                ),
                signals AS (
                    SELECT user_id, 'SPORT' AS kind, sport_id AS target, dw * :sSport AS v FROM decayed
                    UNION ALL SELECT user_id, 'TEMPLATE', template_id, dw * :sTemplate FROM decayed WHERE template_id IS NOT NULL
                    UNION ALL SELECT user_id, 'ORGANIZATION', organizer_org_id, dw * :sOrg FROM decayed WHERE organizer_org_id IS NOT NULL
                    UNION ALL SELECT user_id, 'ORGANIZER_USER', organizer_user_id, dw * :sOrg FROM decayed WHERE organizer_user_id IS NOT NULL
                    UNION ALL SELECT user_id, 'TIME_SLOT', slot, dw * :sSlot FROM decayed WHERE attended
                    UNION ALL SELECT user_id, 'TIME_SLOT', 4, dw * :sSlot FROM decayed WHERE attended AND weekend
                )
                INSERT INTO user_affinities (user_id, kind, target_id, score, updated_at)
                SELECT user_id, kind, target, SUM(v), now() FROM signals GROUP BY user_id, kind, target
                """.formatted(DECAY.formatted("a.at"), hour, hour, hour, hour, hour, hour, isoDow);
        return jdbc.update(sql, new MapSqlParameterSource("hl", halfLifeDays)
                .addValue("sSport", AffinityKind.SPORT.share())
                .addValue("sTemplate", AffinityKind.TEMPLATE.share())
                .addValue("sOrg", AffinityKind.ORGANIZATION.share())
                .addValue("sSlot", AffinityKind.TIME_SLOT.share()));
    }

    /** Секция лога на месяц, начинающийся с monthStart (формат YYYY-MM-01). */
    public void ensureLogPartition(String name, String from, String to) {
        jdbc.getJdbcTemplate().execute("CREATE TABLE IF NOT EXISTS " + name
                + " PARTITION OF recommendation_log FOR VALUES FROM ('" + from + "') TO ('" + to + "')");
    }

    /** Транзакционная advisory-блокировка: фоновую задачу выполняет только один экземпляр бэкенда. */
    public boolean tryXactLock(long key) {
        Boolean locked = jdbc.getJdbcTemplate().queryForObject("SELECT pg_try_advisory_xact_lock(?)", Boolean.class, key);
        return Boolean.TRUE.equals(locked);
    }
}
