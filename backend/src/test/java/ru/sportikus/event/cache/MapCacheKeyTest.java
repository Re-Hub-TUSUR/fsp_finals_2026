package ru.sportikus.event.cache;

import org.junit.jupiter.api.Test;
import ru.sportikus.event.dto.EventFilter;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MapCacheKeyTest {

    private static EventFilter geo(double lat, double lng, double radius) {
        return new EventFilter(null, null, null, null, null, lat, lng, radius);
    }

    @Test
    void nearbyViewportsShareOneKey() {
        String a = MapCacheKey.of(MapCacheKey.normalize(geo(55.7512, 37.6184, 6.0)));
        String b = MapCacheKey.of(MapCacheKey.normalize(geo(55.7549, 37.6221, 7.5)));
        assertThat(a).isEqualTo(b);
    }

    @Test
    void farViewportsGetDifferentKeys() {
        String a = MapCacheKey.of(MapCacheKey.normalize(geo(55.75, 37.61, 5)));
        String b = MapCacheKey.of(MapCacheKey.normalize(geo(59.93, 30.33, 5)));
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    void radiusIsRoundedUpWithMarginAndNeverShrinks() {
        for (double requested : new double[]{0.4, 1, 2.5, 4, 9, 10, 24, 49.5, 99, 150}) {
            EventFilter n = MapCacheKey.normalize(geo(55.75, 37.61, requested));
            assertThat(n.radiusKm()).isGreaterThanOrEqualTo(requested + MapCacheKey.MARGIN_KM);
            assertThat(MapCacheKey.STEPS_KM).contains(n.radiusKm());
        }
    }

    @Test
    void radiusIsCappedAtMaximum() {
        assertThat(MapCacheKey.normalize(geo(55.75, 37.61, 5000)).radiusKm()).isEqualTo(300);
        assertThat(MapCacheKey.normalize(geo(55.75, 37.61, 300)).radiusKm()).isEqualTo(300);
    }

    @Test
    void missingRadiusUsesDefault() {
        EventFilter n = MapCacheKey.normalize(new EventFilter(null, null, null, null, null, 55.75, 37.61, null));
        // 50 км по умолчанию + запас 1 км не помещаются в ступень 50 — берётся следующая
        assertThat(n.radiusKm()).isEqualTo(100.0);
    }

    @Test
    void sportSlugOrderAndDuplicatesDoNotMatter() {
        EventFilter a = new EventFilter(List.of("tennis", "chess"), null, null, null, null, null, null, null);
        EventFilter b = new EventFilter(List.of("chess", " tennis", "chess"), null, null, null, null, null, null, null);
        assertThat(MapCacheKey.of(MapCacheKey.normalize(a))).isEqualTo(MapCacheKey.of(MapCacheKey.normalize(b)));
    }

    @Test
    void filterWithoutGeoHasStableKey() {
        EventFilter n = MapCacheKey.normalize(new EventFilter(null, null, null, null, null, null, null, null));
        assertThat(MapCacheKey.of(n)).startsWith("g=all|");
    }

    @Test
    void textSearchIsNotCacheable() {
        EventFilter search = new EventFilter(null, "  футбол ", null, null, null, 55.75, 37.61, 5.0);
        EventFilter blank = new EventFilter(null, "   ", null, null, null, 55.75, 37.61, 5.0);
        assertThat(MapCacheKey.cacheable(MapCacheKey.normalize(search))).isFalse();
        assertThat(MapCacheKey.normalize(search).query()).isEqualTo("футбол");
        assertThat(MapCacheKey.cacheable(MapCacheKey.normalize(blank))).isTrue();
    }
}
