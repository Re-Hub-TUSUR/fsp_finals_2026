package ru.sportikus.recommendation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventMapper;
import ru.sportikus.recommendation.RecommendationProperties;
import ru.sportikus.recommendation.dto.RecommendationResponse;
import ru.sportikus.recommendation.ranking.CandidateView;
import ru.sportikus.recommendation.ranking.Diversifier;
import ru.sportikus.recommendation.ranking.Ranker;
import ru.sportikus.recommendation.ranking.Scored;
import ru.sportikus.recommendation.signal.SignalRepository;
import ru.sportikus.recommendation.source.Candidate;
import ru.sportikus.recommendation.source.CandidateSource;
import ru.sportikus.recommendation.source.RecommendationContext;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Конвейер одного запроса: кандидаты из нескольких источников → загрузка событий →
 * ранжирование → разнообразие. Только чтение; запись в лог делает {@link RecommendationService}.
 */
@Service
@RequiredArgsConstructor
public class RecommendationEngine {

    private final List<CandidateSource> sources;
    private final Ranker ranker;
    private final EventRepository eventRepository;
    private final EventMapper eventMapper;
    private final SignalRepository signalRepository;
    private final RecommendationProperties props;

    public String model() {
        return ranker.model();
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponse.Item> compute(RecommendationContext ctx, int limit) {
        // 1. Кандидаты: объединяем источники, для каждого события помним все источники
        Map<Long, Double> distance = new LinkedHashMap<>();
        Map<Long, Set<String>> origin = new HashMap<>();
        for (CandidateSource source : sources) {
            for (Candidate c : source.fetch(ctx, props.getCandidatesPerSource())) {
                distance.putIfAbsent(c.eventId(), c.distanceKm());
                origin.computeIfAbsent(c.eventId(), k -> new LinkedHashSet<>()).add(c.source());
            }
        }
        if (distance.isEmpty()) {
            return List.of();
        }

        // 2. Загружаем события одним запросом и строим их представление (счётчики мест и т. п.)
        List<Event> events = eventRepository.findByIdIn(distance.keySet());
        Map<Long, EventResponse> responses = eventMapper.toList(events, ctx.userId(), false).stream()
                .collect(Collectors.toMap(EventResponse::id, Function.identity()));
        Map<Long, Double> popularity = signalRepository.popularity(distance.keySet());

        // 3. Ранжируем; события без свободных мест не рекомендуем
        List<Scored> scored = new ArrayList<>();
        for (Event e : events) {
            EventResponse r = responses.get(e.getId());
            if (r == null || r.confirmedCount() >= r.capacity()) {
                continue;
            }
            CandidateView view = new CandidateView(e, r, distance.get(e.getId()),
                    popularity.getOrDefault(e.getId(), 0.0), origin.get(e.getId()));
            scored.add(ranker.score(view, ctx));
        }
        scored.sort(Comparator.comparingDouble(Scored::score).reversed()
                .thenComparing(s -> s.candidate().event().getStartTime()));

        // 4. Разнообразие и итоговый размер
        return Diversifier.diversify(scored, props.getMaxSameSportInRow(), limit).stream()
                .map(s -> new RecommendationResponse.Item(s.candidate().response(), s.score(), s.reasons(),
                        List.copyOf(s.candidate().sources()), s.breakdown()))
                .toList();
    }
}
