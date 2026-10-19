package ru.sportikus.preference.model;

import java.time.DayOfWeek;
import java.time.ZonedDateTime;

/**
 * Удобное время. Считается в местном часовом поясе мероприятия: «вечер» во Владивостоке
 * и в Калининграде — разные моменты в UTC.
 */
public enum PreferredTime {
    MORNING("утро"),
    DAY("день"),
    EVENING("вечер"),
    WEEKEND("выходные");

    private final String label;

    PreferredTime(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** Время суток (без WEEKEND); null — ночь. */
    public static PreferredTime partOfDay(ZonedDateTime local) {
        int h = local.getHour();
        if (h >= 5 && h < 11) {
            return MORNING;
        }
        if (h >= 11 && h < 17) {
            return DAY;
        }
        if (h >= 17 && h < 23) {
            return EVENING;
        }
        return null;
    }

    public static boolean isWeekend(ZonedDateTime local) {
        DayOfWeek d = local.getDayOfWeek();
        return d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
    }

    /** Идентификатор слота для сигналов TIME_SLOT: 0..2 — утро/день/вечер, 3 — ночь, 4 — выходные. */
    public static long slotId(PreferredTime t) {
        return t == null ? 3 : t == WEEKEND ? 4 : t.ordinal();
    }
}
