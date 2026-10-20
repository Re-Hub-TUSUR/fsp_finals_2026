package ru.sportikus.event;

import org.junit.jupiter.api.Test;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.service.IcsWriter;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class IcsWriterTest {

    @Test
    void writesAnEscapedFoldedUtcEvent() {
        Event e = Event.builder().id(7L)
                .title("Футбол; 5x5, двор")
                .description("Строка 1\nСтрока 2 — ".repeat(5))
                .address("ул. Ленина, 1").lat(56.01).lng(92.89)
                .startTime(Instant.parse("2026-10-20T12:00:00Z")).endTime(Instant.parse("2026-10-20T14:00:00Z"))
                .build();

        String ics = IcsWriter.write(e, Instant.parse("2026-10-19T08:30:00Z"));

        assertThat(ics).startsWith("BEGIN:VCALENDAR\r\n").endsWith("END:VCALENDAR\r\n");
        assertThat(ics).contains("UID:event-7@sportikus\r\n", "DTSTAMP:20261019T083000Z\r\n",
                "DTSTART:20261020T120000Z\r\n", "DTEND:20261020T140000Z\r\n", "GEO:56.01;92.89\r\n");
        assertThat(ics).contains("SUMMARY:Футбол\\; 5x5\\, двор\r\n", "LOCATION:ул. Ленина\\, 1\r\n");
        // Длинные строки переносятся с пробелом в начале продолжения, переводы строк экранируются
        assertThat(ics).contains("\r\n ").contains("DESCRIPTION:Строка 1\\nСтрока 2");
        assertThat(ics.lines()).allMatch(line -> line.length() <= 75);
    }
}
