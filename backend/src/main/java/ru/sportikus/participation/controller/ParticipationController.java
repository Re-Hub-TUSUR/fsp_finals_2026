package ru.sportikus.participation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.participation.dto.DecisionRequest;
import ru.sportikus.participation.dto.JoinRequest;
import ru.sportikus.participation.dto.ParticipationResponse;
import ru.sportikus.participation.service.ParticipationService;
import ru.sportikus.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/api/v1/events/{eventId}")
@RequiredArgsConstructor
@Tag(name = "Participation", description = "Запись на мероприятия и подтверждение участия организатором")
public class ParticipationController {

    private final ParticipationService participationService;

    @PostMapping("/join")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Записаться / подать заявку",
            description = "OPEN — участие подтверждается сразу (CONFIRMED). APPROVAL — создаётся заявка PENDING, "
                    + "которую подтверждает или отклоняет организатор.")
    public ParticipationResponse join(@PathVariable Long eventId, @Valid @RequestBody(required = false) JoinRequest request) {
        return participationService.join(CurrentUser.require(), eventId,
                request == null ? new JoinRequest(null, null, null) : request);
    }

    @DeleteMapping("/join")
    @Operation(summary = "Отменить свою запись или заявку")
    public ParticipationResponse cancel(@PathVariable Long eventId) {
        return participationService.cancel(CurrentUser.require(), eventId);
    }

    @GetMapping("/participations")
    @Operation(summary = "Заявки и участники мероприятия (только организатор)")
    public List<ParticipationResponse> list(@PathVariable Long eventId) {
        return participationService.listForManager(CurrentUser.require(), eventId);
    }

    @PatchMapping("/participations/{participationId}")
    @Operation(summary = "Подтвердить или отклонить заявку (только организатор)")
    public ParticipationResponse decide(@PathVariable Long eventId, @PathVariable Long participationId,
                                        @Valid @RequestBody DecisionRequest request) {
        return participationService.decide(CurrentUser.require(), eventId, participationId, request);
    }

    @PostMapping("/checkin")
    @Operation(summary = "Отметить участника на входе по QR-коду / коду билета (только организатор)")
    public ru.sportikus.participation.dto.CheckInResponse checkIn(@PathVariable Long eventId,
                                                                   @Valid @RequestBody ru.sportikus.participation.dto.CheckInRequest request) {
        return participationService.checkIn(CurrentUser.require(), eventId, request.ticketCode());
    }
}
