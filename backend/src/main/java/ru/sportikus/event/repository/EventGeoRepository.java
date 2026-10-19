package ru.sportikus.event.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Геозапросы по событиям через PostGIS (GiST-индекс по events.geog для опубликованных событий). */
@Repository
@RequiredArgsConstructor
public class EventGeoRepository {

    /** SQL-выражение точки пользователя; параметры :lat и :lng. */
    public static final String POINT = "geography(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))";

    private final NamedParameterJdbcTemplate jdbc;

    /** Id актуальных опубликованных событий в радиусе, от ближних к дальним. */
    public List<Long> publishedWithin(double lat, double lng, double radiusKm, int limit) {
        String sql = "SELECT e.id FROM events e"
                + " WHERE e.status = 'PUBLISHED' AND e.end_time > now()"
                + " AND ST_DWithin(e.geog, " + POINT + ", :radius)"
                + " ORDER BY e.geog <-> " + POINT
                + " LIMIT :limit";
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("lat", lat)
                .addValue("lng", lng)
                .addValue("radius", radiusKm * 1000)
                .addValue("limit", limit), Long.class);
    }
}
