package ru.sportikus.preference.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;

/** Интересы пользователя: набор видов спорта (таблица user_interests). */
@Repository
@RequiredArgsConstructor
public class UserInterestRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public Set<Long> sportIds(Long userId) {
        return new LinkedHashSet<>(jdbc.queryForList(
                "SELECT sport_id FROM user_interests WHERE user_id = :u ORDER BY created_at, sport_id",
                new MapSqlParameterSource("u", userId), Long.class));
    }

    /** Полностью заменяет набор интересов. */
    public void replace(Long userId, Collection<Long> sportIds) {
        MapSqlParameterSource p = new MapSqlParameterSource("u", userId);
        jdbc.update("DELETE FROM user_interests WHERE user_id = :u", p);
        if (sportIds.isEmpty()) return;
        // Один пакет вставок вместо запроса на каждый вид спорта
        SqlParameterSource[] rows = sportIds.stream()
                .map(sportId -> new MapSqlParameterSource("u", userId).addValue("s", sportId))
                .toArray(SqlParameterSource[]::new);
        jdbc.batchUpdate("INSERT INTO user_interests (user_id, sport_id) VALUES (:u, :s) ON CONFLICT DO NOTHING", rows);
    }
}
