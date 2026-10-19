package ru.sportikus.event.cache;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import ru.sportikus.event.dto.EventResponse;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Кэш карты в Redis. Ключи {@code map:<версия>:<фильтр>}; сброс — увеличение счётчика версии
 * ({@code INCR map:version}), старые записи доживают до TTL. Недоступность Redis сайт не ломает:
 * запросы идут в БД, как без кэша.
 */
@Component
@ConditionalOnProperty(name = "map-cache.enabled", havingValue = "true", matchIfMissing = true)
public class RedisMapCache implements MapCache {

    private static final Logger log = LoggerFactory.getLogger(RedisMapCache.class);
    static final String VERSION_KEY = "map:version";
    private static final TypeReference<List<EventResponse>> LIST = new TypeReference<>() {
    };

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final Duration ttl;

    public RedisMapCache(StringRedisTemplate redis, ObjectMapper mapper,
                         @Value("${map-cache.ttl:PT60S}") Duration ttl) {
        this.redis = redis;
        this.mapper = mapper;
        this.ttl = ttl;
    }

    @Override
    public long version() {
        try {
            String v = redis.opsForValue().get(VERSION_KEY);
            return v == null ? 0 : Long.parseLong(v);
        } catch (RuntimeException e) {
            warn("version", e);
            return -1;
        }
    }

    @Override
    public Optional<List<EventResponse>> get(long version, String key) {
        if (version < 0) {
            return Optional.empty();
        }
        try {
            String json = redis.opsForValue().get(fullKey(version, key));
            return json == null ? Optional.empty() : Optional.of(mapper.readValue(json, LIST));
        } catch (Exception e) {
            warn("get", e);
            return Optional.empty();
        }
    }

    @Override
    public void put(long version, String key, List<EventResponse> value) {
        if (version < 0) {
            return;
        }
        try {
            redis.opsForValue().set(fullKey(version, key), mapper.writeValueAsString(value), ttl);
        } catch (Exception e) {
            warn("put", e);
        }
    }

    @Override
    public void invalidate() {
        try {
            redis.opsForValue().increment(VERSION_KEY);
        } catch (RuntimeException e) {
            warn("invalidate", e);
        }
    }

    private static String fullKey(long version, String key) {
        return "map:" + version + ":" + key;
    }

    private void warn(String op, Exception e) {
        log.warn("Map cache {} failed, falling back to the database: {}", op, e.getMessage());
    }
}
