package ru.sportikus.event.service;

import ru.sportikus.event.model.Event;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/** Мероприятие в формате iCalendar (RFC 5545): одно VEVENT в UTC. */
public final class IcsWriter {

    private static final DateTimeFormatter ICS_TIME = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    private IcsWriter() {
    }

    public static String write(Event e, Instant now) {
        StringBuilder sb = new StringBuilder();
        line(sb, "BEGIN:VCALENDAR");
        line(sb, "VERSION:2.0");
        line(sb, "PRODID:-//Sportikus//Event Calendar 1.0//RU");
        line(sb, "CALSCALE:GREGORIAN");
        line(sb, "BEGIN:VEVENT");
        line(sb, "UID:event-" + e.getId() + "@sportikus");
        line(sb, "DTSTAMP:" + ICS_TIME.format(now));
        line(sb, "DTSTART:" + ICS_TIME.format(e.getStartTime()));
        line(sb, "DTEND:" + ICS_TIME.format(e.getEndTime()));
        line(sb, "SUMMARY:" + icsEscape(e.getTitle()));
        if (e.getDescription() != null) {
            line(sb, "DESCRIPTION:" + icsEscape(e.getDescription()));
        }
        line(sb, "LOCATION:" + icsEscape(e.getAddress()));
        line(sb, "GEO:" + e.getLat() + ";" + e.getLng());
        line(sb, "END:VEVENT");
        line(sb, "END:VCALENDAR");
        return sb.toString();
    }

    private static String icsEscape(String s) {
        return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
                .replace("\r\n", "\\n").replace("\n", "\\n");
    }

    /** Строки iCalendar завершаются CRLF и по спецификации «складываются» на 75 символах. */
    private static void line(StringBuilder sb, String text) {
        int limit = 70;
        String rest = text;
        while (rest.length() > limit) {
            sb.append(rest, 0, limit).append("\r\n ");
            rest = rest.substring(limit);
        }
        sb.append(rest).append("\r\n");
    }
}
