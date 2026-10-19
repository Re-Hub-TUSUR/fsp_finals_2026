package ru.sportikus.moderation;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.repository.EventRepository;

import java.time.Instant;
import java.util.List;

/**
 * Доделывает проверки, которые не завершились при создании (перезапуск бэкенда, обрыв соединения).
 * Обычно проверка заканчивается за секунды прямо в запросе создания, и задача ничего не находит.
 */
@Component
@RequiredArgsConstructor
public class ModerationJobs {

    private static final Logger log = LoggerFactory.getLogger(ModerationJobs.class);

    private final EventRepository eventRepository;
    private final EventModerationService moderationService;
    private final ModerationProperties props;

    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT45S")
    public void finishStuckReviews() {
        if (!props.isEnabled()) {
            return;
        }
        List<Event> stuck = eventRepository.findTop20ByModerationStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                ModerationStatus.PENDING, Instant.now().minus(props.getStuckAfter()));
        for (Event event : stuck) {
            try {
                moderationService.review(event.getId());
            } catch (RuntimeException e) {
                log.warn("Could not finish moderation of event {}: {}", event.getId(), e.getMessage());
            }
        }
    }
}
