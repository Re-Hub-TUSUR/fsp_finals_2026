package ru.sportikus.event.cache;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import ru.sportikus.event.dto.EventResponse;

import java.util.List;
import java.util.Optional;

/** Кэш отключён настройкой {@code map-cache.enabled=false}. */
@Component
@ConditionalOnProperty(name = "map-cache.enabled", havingValue = "false")
public class NoOpMapCache implements MapCache {

    @Override
    public long version() {
        return -1;
    }

    @Override
    public Optional<List<EventResponse>> get(long version, String key) {
        return Optional.empty();
    }

    @Override
    public void put(long version, String key, List<EventResponse> value) {
    }

    @Override
    public void invalidate() {
    }
}
