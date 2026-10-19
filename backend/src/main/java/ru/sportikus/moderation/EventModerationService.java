package ru.sportikus.moderation;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.moderation.llm.LlmModerationClient;
import ru.sportikus.moderation.llm.LlmUnavailableException;
import ru.sportikus.moderation.llm.LlmVerdict;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Автопроверка новых мероприятий.
 *
 * <pre>
 *  создание ─▶ фильтр слов ─┬─ ничего не нашёл ─────────────▶ PUBLISHED, CLEAN
 *                           └─ сомнение ─▶ MODERATION, PENDING ─▶ ИИ ─┬─ reject ─▶ UNPUBLISHED, REJECTED (с причиной)
 *                                                                      ├─ approve ─▶ PUBLISHED, FLAGGED (⚠ для админа)
 *                                                                      └─ нет ответа ─▶ PUBLISHED, FLAGGED (нужна ручная проверка)
 * </pre>
 *
 * Первый этап выполняется внутри транзакции создания (это чистый CPU). Второй — вне транзакций:
 * пока идёт запрос к ИИ, строки БД не блокируются, а мероприятие в статусе MODERATION скрыто из каталога.
 */
@Service
@RequiredArgsConstructor
public class EventModerationService {

    private static final Logger log = LoggerFactory.getLogger(EventModerationService.class);
    static final String REJECT_PREFIX = "Не прошло автоматическую проверку: ";

    private final BannedWordFilter filter;
    private final LlmModerationClient llm;
    private final ModerationProperties props;
    private final EventRepository eventRepository;
    private final TransactionTemplate tx;

    /** Снимок данных для ИИ, снятый в короткой транзакции. */
    private record Snapshot(String text, List<ModerationHit> hits) {
    }

    /**
     * Этап 1 — фильтр. Вызывается при создании мероприятия до сохранения.
     * @return true, если нужна проверка ИИ (мероприятие переведено в MODERATION)
     */
    public boolean screen(Event event) {
        if (!props.isEnabled()) {
            return false;
        }
        List<ModerationHit> hits = new ArrayList<>(filter.scan(ModerationText.of(event)));
        topicHit(event).ifPresent(hits::add);
        event.setModerationHits(hits);
        if (hits.isEmpty()) {
            event.setModerationStatus(ModerationStatus.CLEAN);
            event.setModeratedAt(Instant.now());
            return false;
        }
        event.setStatus(EventStatus.MODERATION);
        event.setModerationStatus(ModerationStatus.PENDING);
        return true;
    }

    /**
     * Этап 2 — решение ИИ для мероприятия в статусе PENDING. Безопасно вызывать повторно:
     * если мероприятие уже проверено, ничего не делает.
     */
    public void review(Long eventId) {
        Snapshot snapshot = tx.execute(status -> eventRepository.findDetailedById(eventId)
                .filter(e -> e.getModerationStatus() == ModerationStatus.PENDING)
                .map(e -> new Snapshot(ModerationText.of(e).render(props.getLlm().getMaxInputChars()),
                        List.copyOf(e.getModerationHits())))
                .orElse(null));
        if (snapshot == null) {
            return;
        }

        LlmVerdict verdict;
        String failure = null;
        try {
            verdict = llm.review(snapshot.text(), snapshot.hits());
        } catch (LlmUnavailableException e) {
            log.warn("LLM moderation unavailable for event {}: {}", eventId, e.getMessage());
            verdict = null;
            failure = e.getMessage();
        }

        LlmVerdict decided = verdict;
        String error = failure;
        tx.executeWithoutResult(status -> eventRepository.findById(eventId)
                .filter(e -> e.getModerationStatus() == ModerationStatus.PENDING)
                .ifPresent(e -> apply(e, decided, error)));
    }

    static void apply(Event e, LlmVerdict verdict, String failure) {
        e.setModeratedAt(Instant.now());
        if (verdict == null) {
            // ИИ недоступен: не задерживаем добросовестных авторов, но просим администратора проверить вручную
            e.setStatus(EventStatus.PUBLISHED);
            e.setModerationStatus(ModerationStatus.FLAGGED);
            e.setModerationReason("Проверка ИИ не выполнена (" + failure + ") — нужна ручная проверка");
            return;
        }
        e.setModerationModel(verdict.model());
        e.setModerationReason(verdict.reason());
        if (verdict.decision() == LlmVerdict.Decision.REJECT) {
            e.setStatus(EventStatus.UNPUBLISHED);
            e.setUnpublishReason(REJECT_PREFIX + verdict.reason());
            e.setModerationStatus(ModerationStatus.REJECTED);
        } else {
            e.setStatus(EventStatus.PUBLISHED);
            e.setModerationStatus(ModerationStatus.FLAGGED);
        }
    }

    /** Тематику пользовательского вида спорта или категории «Другое» словарь оценить не может — решает ИИ. */
    private Optional<ModerationHit> topicHit(Event event) {
        if (event.getSport() == null) {
            return Optional.empty();
        }
        boolean custom = props.isReviewCustomSports() && Boolean.TRUE.equals(event.getSport().getIsCustom());
        boolean listed = props.getReviewSportSlugs().contains(event.getSport().getSlug());
        return custom || listed
                ? Optional.of(new ModerationHit(ContentCategory.TOPIC, event.getSport().getName(), "Вид спорта"))
                : Optional.empty();
    }
}
