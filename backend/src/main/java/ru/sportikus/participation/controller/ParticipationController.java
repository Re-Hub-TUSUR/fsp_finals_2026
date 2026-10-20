package ru.sportikus.participation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
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
    @Operation(summary = "Записаться / подать заявку / встать в очередь",
            description = "* `OPEN` — участие подтверждается сразу (`CONFIRMED`), выдаётся код билета `SPT-XXXXXXXX`.\n"
                    + "* `APPROVAL` — создаётся заявка `PENDING`, которую подтверждает или отклоняет организатор (билет выдаётся при подтверждении).\n"
                    + "* Мест нет (или уже есть очередь) — статус `WAITLISTED`: место не занято. Когда кто-то отменяет запись, все из очереди "
                    + "получают уведомление `WAITLIST_SPOT_AVAILABLE`, место достаётся первому, кто повторит `POST /join` "
                    + "(остальные получают `WAITLIST_SPOT_TAKEN`, а запрос опоздавшего — `409` «Место уже заняли»).\n\n"
                    + "Проверяются: собственное мероприятие, снятие с публикации, завершение, закрытая регистрация, повторная заявка, "
                    + "возрастные ограничения (по году рождения из профиля), обязательные ответы анкеты и подтверждение требований организатора. "
                    + "Администратор и организация не записываются (`403`).")
    public ParticipationResponse join(@PathVariable Long eventId, @Valid @RequestBody(required = false) JoinRequest request) {
        return participationService.join(CurrentUser.require(), eventId,
                request == null ? new JoinRequest(null, null, null) : request);
    }

    @DeleteMapping("/join")
    @Operation(summary = "Отменить свою запись, заявку или место в очереди",
            description = "Статус становится `CANCELLED`, записаться можно снова. Если отменялось подтверждённое участие, "
                    + "освободившееся место предлагается очереди.")
    public ParticipationResponse cancel(@PathVariable Long eventId) {
        return participationService.cancel(CurrentUser.require(), eventId);
    }

    @GetMapping("/participations")
    @Operation(summary = "Заявки и участники мероприятия (только организатор)",
            description = "Все записи со статусами, ответами анкеты, кодом билета и отметкой о входе (`checkedIn`).")
    public List<ParticipationResponse> list(@PathVariable Long eventId) {
        return participationService.listForManager(CurrentUser.require(), eventId);
    }

    @GetMapping(value = "/participations/export", produces = "text/csv; charset=UTF-8")
    @Operation(summary = "Экспорт списка участников мероприятия в CSV (только организатор)",
            description = "Формирует файл CSV со списком всех участников, их статусами, билетами, отметками явки и ответами на вопросы.")
    public ResponseEntity<byte[]> exportCsv(@PathVariable Long eventId) {
        byte[] csvBytes = participationService.exportCsv(CurrentUser.require(), eventId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"event_" + eventId + "_participants.csv\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(csvBytes);
    }

    @PatchMapping("/participations/{participationId}")
    @Operation(summary = "Подтвердить или отклонить заявку (только организатор)",
            description = "`decision`: `CONFIRMED` или `REJECTED`, комментарий до 500 символов необязателен. Подтверждение выдаёт билет; "
                    + "если мест нет — `409`. Решение можно изменить: подтверждённого участника можно исключить (`REJECTED`, "
                    + "освободившееся место предлагается очереди), отклонённого — вернуть (`CONFIRMED`). Заявку из очереди (`WAITLISTED`) "
                    + "подтвердить нельзя — место займёт сам участник. Участнику приходит уведомление.")
    public ParticipationResponse decide(@PathVariable Long eventId, @PathVariable Long participationId,
                                        @Valid @RequestBody DecisionRequest request) {
        return participationService.decide(CurrentUser.require(), eventId, participationId, request);
    }

    @PostMapping("/checkin")
    @Operation(summary = "Отметить участника на входе по QR-коду / коду билета (только организатор)",
            description = "Тело: `{\"ticketCode\": \"SPT-A1B2C3D4\"}` — код из QR, регистр не важен. Ответ `200` всегда содержит `status`:\n"
                    + "* `SUCCESS` — участник допущен, отметка сохранена (время и кто отметил);\n"
                    + "* `ALREADY_CHECKED_IN` — билет уже использован, в ответе время первой отметки;\n"
                    + "* `WRONG_EVENT` — билет от другого мероприятия;\n"
                    + "* `NOT_CONFIRMED` — участие не подтверждено;\n"
                    + "* `NOT_FOUND` — такого билета нет.\n\n"
                    + "Код билета постоянный, а вход по нему одноразовый. В ответе есть участник (имя и аватар для сверки), "
                    + "`isPaid` и `price`. Доступно организатору мероприятия и администратору.")
    public ru.sportikus.participation.dto.CheckInResponse checkIn(@PathVariable Long eventId,
                                                                   @Valid @RequestBody ru.sportikus.participation.dto.CheckInRequest request) {
        return participationService.checkIn(CurrentUser.require(), eventId, request.ticketCode());
    }
}
