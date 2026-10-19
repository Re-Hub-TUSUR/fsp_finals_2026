package ru.sportikus.event.cache;

import ru.sportikus.event.dto.EventFilter;

import java.util.List;
import java.util.Locale;

/**
 * Нормализация фильтра каталога и ключ кэша. Клиент шлёт координаты и радиус вида видимой области карты,
 * каждый сдвиг карты давал бы новый ключ, поэтому центр округляется до 0,01° (~1 км), а радиус
 * увеличивается на запас и поднимается до ближайшей ступени — область всегда накрывает запрошенную.
 */
public final class MapCacheKey {

    static final double DEFAULT_RADIUS_KM = 50;
    static final double MAX_RADIUS_KM = 300;
    /** Запас на смещение центра при округлении (диагональ клетки 0,01° — около 1,4 км, половина — 0,7 км). */
    static final double MARGIN_KM = 1;
    static final double[] STEPS_KM = {1, 3, 5, 10, 25, 50, 100, 300};

    private MapCacheKey() {
    }

    public static EventFilter normalize(EventFilter f) {
        Double lat = f.lat();
        Double lng = f.lng();
        Double radius = f.radiusKm();
        if (lat != null && lng != null) {
            lat = round(lat);
            lng = round(lng);
            radius = bucket(radius == null ? DEFAULT_RADIUS_KM : radius);
        }
        String query = f.query() == null || f.query().isBlank() ? null : f.query().trim();
        List<String> sports = f.sportSlugs() == null || f.sportSlugs().isEmpty() ? null
                : f.sportSlugs().stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().sorted().toList();
        return new EventFilter(sports == null || sports.isEmpty() ? null : sports, query, f.skillLevel(),
                f.joinMode(), f.templateCode(), lat, lng, radius);
    }

    /** Текстовый поиск почти не повторяется — в кэш не кладём. */
    public static boolean cacheable(EventFilter normalized) {
        return normalized.query() == null;
    }

    /** Ключ строится от уже нормализованного фильтра. */
    public static String of(EventFilter f) {
        String geo = f.lat() == null || f.lng() == null ? "all"
                : String.format(Locale.ROOT, "%.2f,%.2f,%.0f", f.lat(), f.lng(), f.radiusKm());
        return "g=" + geo
                + "|s=" + (f.sportSlugs() == null ? "" : String.join(",", f.sportSlugs()))
                + "|k=" + (f.skillLevel() == null ? "" : f.skillLevel().name())
                + "|j=" + (f.joinMode() == null ? "" : f.joinMode().name())
                + "|t=" + (f.templateCode() == null ? "" : f.templateCode());
    }

    static double round(double v) {
        return Math.round(v * 100) / 100.0;
    }

    static double bucket(double radiusKm) {
        double wanted = Math.min(Math.max(radiusKm, 0) + MARGIN_KM, MAX_RADIUS_KM);
        for (double step : STEPS_KM) {
            if (wanted <= step) {
                return step;
            }
        }
        return MAX_RADIUS_KM;
    }
}
