package ru.sportikus.event;

import org.junit.jupiter.api.Test;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.model.RecurrenceRule;
import ru.sportikus.event.service.Recurrence;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RecurrenceTest {

    private static Event weekly(String start, String end, String zone) {
        return Event.builder().id(1L).title("Йога").timeZone(zone)
                .startTime(Instant.parse(start)).endTime(Instant.parse(end))
                .recurrenceRule(RecurrenceRule.CUSTOM).recurrenceIntervalDays(7)
                .status(EventStatus.ARCHIVED).build();
    }

    @Test
    void nextOccurrenceKeepsLocalClockTimeAcrossDaylightSavingChange() {
        // Берлин: 19:00 CEST (UTC+2) в субботу перед переходом на зимнее время
        Event source = weekly("2026-10-24T17:00:00Z", "2026-10-24T18:30:00Z", "Europe/Berlin");

        Event next = Recurrence.nextOccurrence(source, Instant.parse("2026-10-24T19:00:00Z"));

        // Через неделю 19:00 уже по CET (UTC+1) — в UTC на час позже
        assertThat(next.getStartTime()).isEqualTo(Instant.parse("2026-10-31T18:00:00Z"));
        assertThat(next.getEndTime()).isEqualTo(Instant.parse("2026-10-31T19:30:00Z"));
        assertThat(next.getStatus()).isEqualTo(EventStatus.PUBLISHED);
    }

    @Test
    void skipsOccurrencesThatAreAlreadyInThePast() {
        Event source = weekly("2026-10-01T10:00:00Z", "2026-10-01T11:00:00Z", "UTC");

        Event next = Recurrence.nextOccurrence(source, Instant.parse("2026-10-20T00:00:00Z"));

        assertThat(next.getStartTime()).isEqualTo(Instant.parse("2026-10-22T10:00:00Z"));
    }

    @Test
    void keepsTheSeriesIdOrStartsANewSeries() {
        UUID series = UUID.randomUUID();
        Event inSeries = weekly("2026-10-01T10:00:00Z", "2026-10-01T11:00:00Z", "UTC");
        inSeries.setRecurrenceSeriesId(series);
        Instant now = Instant.parse("2026-10-02T00:00:00Z");

        assertThat(Recurrence.nextOccurrence(inSeries, now).getRecurrenceSeriesId()).isEqualTo(series);
        assertThat(Recurrence.nextOccurrence(weekly("2026-10-01T10:00:00Z", "2026-10-01T11:00:00Z", "UTC"), now)
                .getRecurrenceSeriesId()).isNotNull();
    }
}
