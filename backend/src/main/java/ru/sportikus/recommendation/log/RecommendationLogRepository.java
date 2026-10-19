package ru.sportikus.recommendation.log;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Лог показов и действий (секционированная таблица recommendation_log). Из него считаются
 * CTR и доля записей, и он же — обучающая выборка для модели ранжирования следующей версии.
 * Ошибка записи лога никогда не ломает выдачу.
 */
@Repository
@RequiredArgsConstructor
public class RecommendationLogRepository {

    private static final Logger log = LoggerFactory.getLogger(RecommendationLogRepository.class);
    private static final UUID NO_REQUEST = new UUID(0, 0);

    private final JdbcTemplate jdbc;

    public record Impression(long eventId, int position, double score) {
    }

    public void logImpressions(UUID requestId, Long userId, String model, List<Impression> items) {
        if (items.isEmpty()) {
            return;
        }
        try {
            jdbc.batchUpdate("INSERT INTO recommendation_log (request_id, user_id, event_id, action, position, score, model)"
                            + " VALUES (?, ?, ?, 'IMPRESSION', ?, ?, ?)",
                    items, items.size(), (ps, item) -> {
                        ps.setObject(1, requestId);
                        ps.setLong(2, userId);
                        ps.setLong(3, item.eventId());
                        ps.setInt(4, item.position());
                        ps.setDouble(5, item.score());
                        ps.setString(6, model);
                    });
        } catch (RuntimeException e) {
            log.warn("Failed to log recommendation impressions: {}", e.getMessage());
        }
    }

    public void logAction(Long userId, Long eventId, String action) {
        logAction(null, userId, eventId, action, null);
    }

    public void logAction(UUID requestId, Long userId, Long eventId, String action, Integer position) {
        try {
            jdbc.update("INSERT INTO recommendation_log (request_id, user_id, event_id, action, position) VALUES (?, ?, ?, ?, ?)",
                    requestId == null ? NO_REQUEST : requestId, userId, eventId, action, position);
        } catch (RuntimeException e) {
            log.warn("Failed to log recommendation action {}: {}", action, e.getMessage());
        }
    }
}
