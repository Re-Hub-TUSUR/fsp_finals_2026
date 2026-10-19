package ru.sportikus.recommendation.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.sportikus.recommendation.RecommendationProperties;
import ru.sportikus.recommendation.dto.RecommendationResponse;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Кэш в памяти с TTL и ограничением размера. */
@Component
@RequiredArgsConstructor
public class InMemoryRecommendationCache implements RecommendationCache {

    private record Entry(RecommendationResponse value, Instant expiresAt) {
    }

    private final RecommendationProperties props;
    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> keysByUser = new ConcurrentHashMap<>();

    @Override
    public Optional<RecommendationResponse> get(String key) {
        Entry e = entries.get(key);
        if (e == null) {
            return Optional.empty();
        }
        if (e.expiresAt().isBefore(Instant.now())) {
            entries.remove(key);
            return Optional.empty();
        }
        return Optional.of(e.value());
    }

    @Override
    public void put(String key, Long userId, RecommendationResponse value) {
        if (entries.size() >= props.getCacheMaxEntries()) {
            Instant now = Instant.now();
            entries.entrySet().removeIf(en -> en.getValue().expiresAt().isBefore(now));
            if (entries.size() >= props.getCacheMaxEntries()) {
                entries.clear();
                keysByUser.clear();
            }
        }
        entries.put(key, new Entry(value, Instant.now().plus(props.getCacheTtl())));
        keysByUser.computeIfAbsent(userId, u -> ConcurrentHashMap.newKeySet()).add(key);
    }

    @Override
    public void evictUser(Long userId) {
        Set<String> keys = keysByUser.remove(userId);
        if (keys != null) {
            keys.forEach(entries::remove);
        }
    }
}
