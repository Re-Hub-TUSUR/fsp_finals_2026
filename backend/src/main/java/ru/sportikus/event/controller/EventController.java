package ru.sportikus.event.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.event.dto.CreateEventRequest;
import ru.sportikus.event.dto.EventFilter;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.event.service.EventService;
import ru.sportikus.security.CurrentUser;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Каталог и создание мероприятий (от пользователя и от организации)")
public class EventController {

    private final EventService eventService;

    @GetMapping
    @Operation(summary = "Каталог опубликованных мероприятий с фильтрами",
            description = "sport — slug'и через запятую; lat/lng/radiusKm — поиск рядом; q — поиск по названию, описанию и адресу.")
    public List<EventResponse> list(
            @RequestParam(required = false) String sport,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false) SkillLevel skillLevel,
            @RequestParam(required = false) JoinMode joinMode,
            @RequestParam(required = false) String template,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radiusKm
    ) {
        List<String> slugs = sport == null || sport.isBlank() ? List.of()
                : Arrays.stream(sport.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        EventFilter filter = new EventFilter(slugs, query, skillLevel, joinMode, template, lat, lng, radiusKm);
        return eventService.catalog(filter, CurrentUser.get());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Карточка мероприятия (доступна и после снятия с публикации — с причиной)")
    public EventResponse get(@PathVariable Long id) {
        return eventService.details(id, CurrentUser.get());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Создать мероприятие",
            description = "Пользователь публикует от своего имени. Организатор — от имени организации, только если она одобрена; "
                    + "для организации обязательны контакты (orgDetails).")
    public EventResponse create(@Valid @RequestBody CreateEventRequest request) {
        return eventService.create(CurrentUser.require(), request);
    }

    @GetMapping("/{id}/ics")
    @Operation(summary = "Экспорт мероприятия в календарь (.ics) для iOS и Google Calendar")
    public ResponseEntity<String> exportIcs(@PathVariable Long id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"event-" + id + ".ics\"")
                .contentType(MediaType.parseMediaType("text/calendar;charset=UTF-8"))
                .body(eventService.ics(id));
    }
}
