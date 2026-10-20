package ru.sportikus.recommendation.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import ru.sportikus.recommendation.RecommendationProperties;
import ru.sportikus.recommendation.signal.SignalRepository;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Фоновые пересчёты. Каждая задача берёт транзакционную advisory-блокировку PostgreSQL,
 * поэтому при нескольких экземплярах бэкенда задачу выполняет только один из них.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "recommendations.jobs", name = "enabled", havingValue = "true", matchIfMissing = true)
public class RecommendationJobs {

    private static final Logger log = LoggerFactory.getLogger(RecommendationJobs.class);
    private static final long LOCK_POPULARITY = 7_301L;
    private static final long LOCK_NIGHTLY = 7_302L;
    private static final DateTimeFormatter PARTITION = DateTimeFormatter.ofPattern("'recommendation_log_y'yyyy'm'MM");

    private final SignalRepository signals;
    private final RecommendationProperties props;
    private final TransactionTemplate tx;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        ensureLogPartitions();
        nightly();
    }

    @Scheduled(fixedDelayString = "${recommendations.jobs.popularity-refresh:PT5M}", initialDelayString = "PT30S")
    public void refreshPopularity() {
        locked(LOCK_POPULARITY, "popularity", signals::refreshPopularity);
    }

    /** «Похожие виды спорта», полная пересборка сигналов с затуханием, секции лога на будущее. */
    @Scheduled(cron = "${recommendations.jobs.nightly-cron:0 30 3 * * *}")
    public void nightly() {
        locked(LOCK_NIGHTLY, "nightly", () -> {
            signals.refreshSportSimilarity();
            int rows = signals.rebuildAffinities(props.getAffinityHalfLifeDays());
            signals.refreshPopularity();
            log.info("Recommendation signals rebuilt: {} affinities", rows);
        });
        ensureLogPartitions();
    }

    /** Секции лога на текущий и следующий месяц. */
    void ensureLogPartitions() {
        LocalDate month = LocalDate.now().withDayOfMonth(1);
        for (int i = 0; i < 2; i++) {
            LocalDate from = month.plusMonths(i);
            try {
                signals.ensureLogPartition(from.format(PARTITION), from.toString(), from.plusMonths(1).toString());
            } catch (RuntimeException e) {
                // Например, строки этого месяца уже лежат в DEFAULT-секции — их перенесёт обслуживание БД
                log.warn("Could not create log partition for {}: {}", from, e.getMessage());
            }
        }
    }

    private void locked(long key, String name, Runnable job) {
        try {
            tx.executeWithoutResult(status -> {
                if (signals.tryXactLock(key)) {
                    job.run();
                } else {
                    log.debug("Job {} is running on another instance", name);
                }
            });
        } catch (RuntimeException e) {
            // Сбой пересчёта неожиданный (SQL, блокировки) — нужен полный стек
            log.warn("Recommendation job {} failed", name, e);
        }
    }
}
