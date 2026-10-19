package ru.sportikus.recommendation.signal;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import ru.sportikus.participation.ParticipationChangedEvent;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.preference.PreferencesChangedEvent;
import ru.sportikus.preference.model.PreferredTime;
import ru.sportikus.preference.model.UserPreferences;
import ru.sportikus.preference.repository.UserInterestRepository;
import ru.sportikus.preference.service.PreferencesService;
import ru.sportikus.recommendation.RecommendationProperties;
import ru.sportikus.recommendation.cache.RecommendationCache;
import ru.sportikus.recommendation.log.RecommendationLogRepository;

import java.time.Year;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Собирает сигналы пользователя и обновляет их по его действиям. */
@Service
@RequiredArgsConstructor
public class SignalService {

    /** Базовые веса действий (см. {@link SignalRepository#rebuildAffinities}). */
    static final double JOIN = 1.0;
    static final double CANCEL = -0.5;
    static final double DISMISS = -0.5;
    static final double CLICK = 0.15;

    private final SignalRepository signalRepository;
    private final UserInterestRepository interestRepository;
    private final PreferencesService preferencesService;
    private final RecommendationProperties props;
    private final RecommendationCache cache;
    private final RecommendationLogRepository logRepository;

    public UserSignals load(Long userId, UserPreferences prefs) {
        Set<Long> interests = interestRepository.sportIds(userId);
        Map<AffinityKind, Map<Long, Double>> affinities = signalRepository.affinities(userId, props.getAffinityHalfLifeDays());

        // Похожие виды спорта считаем от явных интересов и от того, куда пользователь реально ходит
        Set<Long> base = new HashSet<>(interests);
        affinities.getOrDefault(AffinityKind.SPORT, Map.of()).forEach((sport, score) -> {
            if (score > 0.3) {
                base.add(sport);
            }
        });
        Map<Long, UserSignals.Similar> similar = new HashMap<>();
        for (Map<String, Object> row : signalRepository.similarSports(base, props.getSimilarityMinScore(), props.getSimilarityMinCooccurrence())) {
            long sport = ((Number) row.get("similar_sport_id")).longValue();
            if (base.contains(sport)) {
                continue;
            }
            double score = ((Number) row.get("score")).doubleValue();
            long via = ((Number) row.get("sport_id")).longValue();
            similar.merge(sport, new UserSignals.Similar(score, via), (a, b) -> a.score() >= b.score() ? a : b);
        }

        return new UserSignals(userId, interests, similar, affinities,
                prefs == null ? null : prefs.getSkillLevel(),
                prefs == null ? List.of() : prefs.getPreferredTimes(),
                prefs == null || prefs.getBirthYear() == null ? null : Year.now().getValue() - prefs.getBirthYear(),
                prefs == null ? null : prefs.getMaxPrice(),
                prefs == null ? null : prefs.getMaxDistanceKm());
    }

    /** Запись, отмена или решение организатора → обновляем накопленный интерес. */
    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onParticipationChanged(ParticipationChangedEvent e) {
        boolean wasActive = e.previous() == ParticipationStatus.PENDING || e.previous() == ParticipationStatus.CONFIRMED;
        boolean isActive = e.current() == ParticipationStatus.PENDING || e.current() == ParticipationStatus.CONFIRMED;
        double delta = 0;
        if (isActive && !wasActive && e.previous() != ParticipationStatus.REJECTED) {
            delta = JOIN;
            logRepository.logAction(e.userId(), e.eventId(), "JOIN");
        } else if (e.current() == ParticipationStatus.CANCELLED) {
            delta = CANCEL;
        }
        if (delta != 0) {
            apply(e.userId(), e.eventId(), delta, true);
        }
        cache.evictUser(e.userId());
    }

    @TransactionalEventListener(fallbackExecution = true)
    public void onPreferencesChanged(PreferencesChangedEvent e) {
        cache.evictUser(e.userId());
    }

    @Transactional
    public void dismiss(Long userId, Long eventId) {
        signalRepository.dismiss(userId, eventId);
        apply(userId, eventId, DISMISS, false);
        cache.evictUser(userId);
    }

    @Transactional
    public void undismiss(Long userId, Long eventId) {
        if (signalRepository.undismiss(userId, eventId)) {
            apply(userId, eventId, -DISMISS, false);
        }
        cache.evictUser(userId);
    }

    @Transactional
    public void click(Long userId, Long eventId) {
        apply(userId, eventId, CLICK, false);
    }

    /** Распределяет вес действия по сущностям события; время суток учитываем только для участия. */
    private void apply(Long userId, Long eventId, double delta, boolean attended) {
        signalRepository.eventFacts(eventId).ifPresent(f -> {
            double hl = props.getAffinityHalfLifeDays();
            add(userId, AffinityKind.SPORT, f.sportId(), delta, hl);
            add(userId, AffinityKind.TEMPLATE, f.templateId(), delta, hl);
            add(userId, AffinityKind.ORGANIZATION, f.organizationId(), delta, hl);
            add(userId, AffinityKind.ORGANIZER_USER, f.organizerUserId(), delta, hl);
            if (attended) {
                ZonedDateTime local = f.startTime().atZone(ZoneId.of(f.timeZone() == null ? "Europe/Moscow" : f.timeZone()));
                add(userId, AffinityKind.TIME_SLOT, PreferredTime.slotId(PreferredTime.partOfDay(local)), delta, hl);
                if (PreferredTime.isWeekend(local)) {
                    add(userId, AffinityKind.TIME_SLOT, PreferredTime.slotId(PreferredTime.WEEKEND), delta, hl);
                }
            }
        });
    }

    private void add(Long userId, AffinityKind kind, Long target, double delta, double hl) {
        if (target != null) {
            signalRepository.addAffinity(userId, kind, target, delta * kind.share(), hl);
        }
    }

    /** Предпочтения для движка; вынесено сюда, чтобы движок зависел от одного сервиса сигналов. */
    public UserPreferences preferences(Long userId) {
        return preferencesService.find(userId).orElse(null);
    }
}
