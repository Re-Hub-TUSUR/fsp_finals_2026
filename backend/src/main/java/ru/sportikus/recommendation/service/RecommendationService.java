package ru.sportikus.recommendation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.preference.model.UserPreferences;
import ru.sportikus.recommendation.RecommendationProperties;
import ru.sportikus.recommendation.cache.RecommendationCache;
import ru.sportikus.recommendation.dto.FeedbackRequest;
import ru.sportikus.recommendation.dto.RecommendationResponse;
import ru.sportikus.recommendation.log.RecommendationLogRepository;
import ru.sportikus.recommendation.signal.SignalService;
import ru.sportikus.recommendation.signal.UserSignals;
import ru.sportikus.recommendation.source.RecommendationContext;
import ru.sportikus.sport.model.Sport;
import ru.sportikus.sport.repository.SportRepository;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/** Точка входа: определяет местоположение, собирает сигналы, кэширует выдачу, пишет лог показов. */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationEngine engine;
    private final SignalService signalService;
    private final RecommendationCache cache;
    private final RecommendationLogRepository logRepository;
    private final SportRepository sportRepository;
    private final EventRepository eventRepository;
    private final RecommendationProperties props;

    private record Location(double lat, double lng, String source, String cityName) {
    }

    public RecommendationResponse recommend(Long userId, Double lat, Double lng, Integer limit) {
        int size = Math.max(1, Math.min(limit == null ? props.getDefaultLimit() : limit, props.getMaxLimit()));
        UserPreferences prefs = signalService.preferences(userId);
        Location location = resolveLocation(lat, lng, prefs);
        UserSignals signals = signalService.load(userId, prefs);
        int radius = Math.min(signals.maxDistanceKm() == null ? props.getDefaultRadiusKm() : signals.maxDistanceKm(),
                props.getMaxRadiusKm());

        if (location == null) {
            return new RecommendationResponse(UUID.randomUUID(), engine.model(), null, signals.isColdStart(), true,
                    List.of(), Instant.now());
        }

        // Ключ кэша: пользователь + точка с точностью ~1 км + размер выдачи
        String key = String.format(Locale.ROOT, "%d:%.2f:%.2f:%d", userId, location.lat(), location.lng(), size);
        RecommendationResponse response = cache.get(key).orElseGet(() -> {
            RecommendationContext ctx = new RecommendationContext(userId, location.lat(), location.lng(), radius,
                    props.getHorizonDays(), Instant.now(), signals, sportNames(signals));
            RecommendationResponse fresh = new RecommendationResponse(UUID.randomUUID(), engine.model(),
                    new RecommendationResponse.LocationInfo(location.lat(), location.lng(), location.source(),
                            location.cityName(), radius),
                    signals.isColdStart(), false, engine.compute(ctx, size), Instant.now());
            cache.put(key, userId, fresh);
            return fresh;
        });

        List<RecommendationResponse.Item> items = response.items();
        logRepository.logImpressions(response.requestId(), userId, response.model(), IntStream.range(0, items.size())
                .mapToObj(i -> new RecommendationLogRepository.Impression(items.get(i).event().id(), i, items.get(i).score()))
                .toList());
        return response;
    }

    public void feedback(Long userId, FeedbackRequest req) {
        if (!eventRepository.existsById(req.eventId())) {
            throw ApiException.notFound("Мероприятие не найдено");
        }
        logRepository.logAction(req.requestId(), userId, req.eventId(), req.action().name(), req.position());
        switch (req.action()) {
            case CLICK -> signalService.click(userId, req.eventId());
            case DISMISS -> signalService.dismiss(userId, req.eventId());
        }
    }

    public void undoDismiss(Long userId, Long eventId) {
        signalService.undismiss(userId, eventId);
    }

    /** Точка поиска: геолокация устройства → точка дома → центр домашнего города. */
    private Location resolveLocation(Double lat, Double lng, UserPreferences prefs) {
        if (lat != null && lng != null) {
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                throw ApiException.badRequest("Некорректные координаты");
            }
            return new Location(lat, lng, "GEO", null);
        }
        if (prefs == null) {
            return null;
        }
        String city = prefs.getHomeCity() == null ? null : prefs.getHomeCity().getName();
        if (prefs.getHomeLat() != null && prefs.getHomeLng() != null) {
            return new Location(prefs.getHomeLat(), prefs.getHomeLng(), "HOME", city);
        }
        if (prefs.getHomeCity() != null) {
            return new Location(prefs.getHomeCity().getLat(), prefs.getHomeCity().getLng(), "CITY", city);
        }
        return null;
    }

    private Map<Long, String> sportNames(UserSignals s) {
        Set<Long> ids = new HashSet<>(s.interests());
        s.similarSports().values().forEach(sim -> ids.add(sim.viaSportId()));
        return sportRepository.findAllById(ids).stream().collect(Collectors.toMap(Sport::getId, Sport::getName));
    }
}
