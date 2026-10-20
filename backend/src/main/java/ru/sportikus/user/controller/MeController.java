package ru.sportikus.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.service.EventService;
import ru.sportikus.participation.dto.ParticipationResponse;
import ru.sportikus.participation.service.ParticipationService;
import ru.sportikus.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@Tag(name = "Me", description = "Личный кабинет: мои заявки и мои мероприятия")
public class MeController {

    private final EventService eventService;
    private final ParticipationService participationService;

    @GetMapping("/participations")
    @Operation(summary = "Мои заявки и участия",
            description = "Все записи пользователя со статусами (`PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `WAITLISTED`), "
                    + "кодом билета (`ticketCode`) и мероприятием, включая завершённые и архивные.")
    public List<ParticipationResponse> participations() {
        return participationService.mine(CurrentUser.require());
    }

    @GetMapping("/events")
    @Operation(summary = "Мероприятия, которыми я управляю (мои и моей организации), с числом заявок в ожидании",
            description = "В том числе снятые, отклонённые автопроверкой и архивные (`status = ARCHIVED`).")
    public List<EventResponse> events() {
        return eventService.managedBy(CurrentUser.require());
    }
}
