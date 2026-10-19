package ru.sportikus.event.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Управление спортивными мероприятиями и каталог")
public class EventController {

    private Map<String, Object> createEventMap(
            long id, String title, String description,
            long sportId, String sportName, String sportSlug,
            String organizerName, Instant startTime, Instant endTime,
            double lat, double lng, String address,
            int capacity, int confirmedCount,
            String joinMode, String skillLevel, String status
    ) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("title", title);
        map.put("description", description);
        map.put("sport", Map.of("id", sportId, "name", sportName, "slug", sportSlug));
        map.put("organizerName", organizerName);
        map.put("startTime", startTime.toString());
        map.put("endTime", endTime.toString());
        map.put("lat", lat);
        map.put("lng", lng);
        map.put("address", address);
        map.put("capacity", capacity);
        map.put("confirmedCount", confirmedCount);
        map.put("joinMode", joinMode);
        map.put("skillLevel", skillLevel);
        map.put("status", status);
        return map;
    }

    @GetMapping
    @Operation(summary = "Получить список мероприятий с фильтрами по спорту и локации")
    public ResponseEntity<List<Map<String, Object>>> getEvents(
            @RequestParam(required = false) String sport,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false, defaultValue = "10") Double radiusKm
    ) {
        return ResponseEntity.ok(List.of(
            createEventMap(
                1L, "Утренний забег на о. Татышев",
                "Легкий темповый бег 5 км по живописным дорожкам острова.",
                3L, "Бег", "beg",
                "СК «Енисей»",
                Instant.now().plusSeconds(7200),
                Instant.now().plusSeconds(12600),
                56.0235, 92.9351, "Красноярск, остров Татышев",
                20, 1,
                "OPEN", "ANY", "PUBLISHED"
            ),
            createEventMap(
                2L, "Дворовый футбол 5x5",
                "Собираем 2 команды для дружеского матча. Нужен вратарь.",
                1L, "Футбол", "futbol",
                "Иван Иванов",
                Instant.now().plusSeconds(14400),
                Instant.now().plusSeconds(21600),
                56.0125, 92.8680, "Красноярск, ул. Ленина, д. 118",
                10, 1,
                "OPEN", "AMATEUR", "PUBLISHED"
            )
        ));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Получить детальную информацию о мероприятии")
    public ResponseEntity<Map<String, Object>> getEventById(@PathVariable Long id) {
        return ResponseEntity.ok(createEventMap(
            id, "Утренний забег на о. Татышев",
            "Легкий темповый бег 5 км по живописным дорожкам острова.",
            3L, "Бег", "beg",
            "СК «Енисей»",
            Instant.now().plusSeconds(7200),
            Instant.now().plusSeconds(12600),
            56.0235, 92.9351, "Красноярск, остров Татышев",
            20, 1,
            "OPEN", "ANY", "PUBLISHED"
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
