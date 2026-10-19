package ru.sportikus.event.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.sport.dto.SportDto;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RedisMapCacheTest {

    private static final Duration TTL = Duration.ofSeconds(60);

    private StringRedisTemplate redis;
    private ValueOperations<String, String> ops;
    private RedisMapCache cache;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        cache = new RedisMapCache(redis, new ObjectMapper().findAndRegisterModules(), TTL);
    }

    private static EventResponse event(long id) {
        return new EventResponse(id, "Утренний бег", null, new SportDto(1L, "Бег", "running", false), null,
                "Анна", null, false, null, 7L,
                Instant.parse("2030-01-01T07:00:00Z"), Instant.parse("2030-01-01T08:00:00Z"),
                55.75, 37.61, "Парк", "Москва", "Europe/Moscow",
                10, 3, JoinMode.OPEN, SkillLevel.ANY, BigDecimal.ZERO, null, null, null, null,
                EventStatus.PUBLISHED, null,
                null, null, null, null, null,
                List.of(), null, null, null, null);
    }

    @Test
    void roundTripsEventsThroughJson() {
        java.util.concurrent.atomic.AtomicReference<String> stored = new java.util.concurrent.atomic.AtomicReference<>();
        org.mockito.Mockito.doAnswer(inv -> {
            stored.set(inv.getArgument(1));
            return null;
        }).when(ops).set(eq("map:3:k"), anyString(), eq(TTL));

        cache.put(3, "k", List.of(event(1), event(2)));
        when(ops.get("map:3:k")).thenReturn(stored.get());

        Optional<List<EventResponse>> hit = cache.get(3, "k");
        assertThat(hit).isPresent();
        assertThat(hit.get()).containsExactly(event(1), event(2));
    }

    @Test
    void missingKeyIsAMiss() {
        assertThat(cache.get(0, "absent")).isEmpty();
    }

    @Test
    void versionDefaultsToZeroAndFollowsCounter() {
        assertThat(cache.version()).isZero();
        when(ops.get(RedisMapCache.VERSION_KEY)).thenReturn("12");
        assertThat(cache.version()).isEqualTo(12);
    }

    @Test
    void invalidateBumpsVersion() {
        cache.invalidate();
        verify(ops).increment(RedisMapCache.VERSION_KEY);
    }

    @Test
    void redisFailureDegradesToMissInsteadOfThrowing() {
        when(ops.get(anyString())).thenThrow(new RedisConnectionFailureException("down"));
        org.mockito.Mockito.doThrow(new RedisConnectionFailureException("down")).when(ops).increment(anyString());
        org.mockito.Mockito.doThrow(new RedisConnectionFailureException("down")).when(ops).set(anyString(), anyString(), any(Duration.class));

        assertThat(cache.version()).isNegative();
        assertThat(cache.get(0, "k")).isEmpty();
        cache.put(0, "k", List.of(event(1)));
        cache.invalidate();
    }

    @Test
    void negativeVersionSkipsRedisCompletely() {
        assertThat(cache.get(-1, "k")).isEmpty();
        cache.put(-1, "k", List.of(event(1)));
        org.mockito.Mockito.verifyNoInteractions(ops);
    }

    @Test
    void corruptedJsonIsAMiss() {
        when(ops.get("map:0:k")).thenReturn("{not json");
        assertThat(cache.get(0, "k")).isEmpty();
    }
}
