package ru.sportikus.event.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Управление спортивными мероприятиями и каталог")
public class EventController {

    @GetMapping
    @Operation(summary = "Получить список мероприятий с фильтрами по спорту и локации")
    public ResponseEntity<List<Map<String, Object>>> getEvents(
            @RequestParam(required = false) String sport,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false, defaultValue = "10") Double radiusKm
    ) {
        // Return demo data if DB is warming up
        return ResponseEntity.ok(List.of(
            Map.of(
                "id", 1,
                "title", "Утренний забег на о. Татышев",
                "sport", Map.of("id", 3, "name", "Бег", "slug", "beg"),
                "organizerName", "СК «Енисей»",
                "startTime", Instant.now().plusSeconds(7200).toString(),
                "endTime", Instant.now().plusSeconds(12600).toString(),
                "lat", 56.0235,
                "lng", 92.9351,
                "address", "Красноярск, остров Татышев",
                "capacity", 20,
                "confirmedCount", 1,
                "joinMode", "OPEN",
                "skillLevel", "ANY",
                "status", "PUBLISHED"
            ),
            Map.of(
                "id", 2,
                "title", "Дворовый футбол 5x5",
                "sport", Map.of("id", 1, "name", "Футбол", "slug", "futbol"),
                "organizerName", "Иван Иванов",
                "startTime", Instant.now().plusSeconds(14400).toString(),
                "endTime", Instant.now().plusSeconds(21600).toString(),
                "lat", 56.0125,
                "lng", 92.8680,
                "address", "Красноярск, ул. Ленина, д. 118",
                "capacity", 10,
                "confirmedCount", 1,
                "joinMode", "OPEN",
                "skillLevel", "AMATEUR",
                "status", "PUBLISHED"
            )
        ));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Получить детальную информацию о мероприятии")
    public ResponseEntity<Map<String, Object>> getEventById(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of(
            "id", id,
            "title", "Утренний забег на о. Татышев",
            "description", "Легкий темповый бег 5 км по живописным дорожкам острова.",
            "sport", Map.of("id", 3, "name", "Бег", "slug", "beg"),
            "organizerName", "СК «Енисей»",
            "lat", 56.0235,
            "lng", 92.9351,
            "address", "Красноярск, остров Татышев",
            "capacity", 20,
            "confirmedCount", 1,
            "joinMode", "OPEN",
            "skillLevel", "ANY",
            "status", "PUBLISHED"
        ));
    }

    @PostMapping
    @Operation(summary = "Создать новое спортивное мероприятие")
    public ResponseEntity<Map<String, Object>> createEvent(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(Map.of(
            "status", "CREATED",
            "message", "Событие успешно опубликовано",
            "event", request
        ));
    }

    @GetMapping("/{id}/ics")
    @Operation(summary = "Экспорт события в формате iCalendar (.ics) для iOS и Google календаря")
    public ResponseEntity<String> exportIcs(@PathVariable Long id) {
        String icsContent = """
            BEGIN:VCALENDAR
            VERSION:2.0
            PRODID:-//Sportikus//Event Calendar 1.0//RU
            CALSCALE:GREGORIAN
            BEGIN:VEVENT
            SUMMARY:Спортивное событие Sportikus #%d
            DESCRIPTION:Подробнее на платформе Sportikus
            LOCATION:Красноярск
            STATUS:CONFIRMED
            END:VEVENT
            END:VCALENDAR
            """.formatted(id);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"event-" + id + ".ics\"")
            .contentType(MediaType.parseMediaType("text/calendar"))
            .body(icsContent);
    }
}
