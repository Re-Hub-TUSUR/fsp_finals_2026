package ru.sportikus.notification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.sportikus.notification.dto.InviteFriendResponse;
import ru.sportikus.notification.dto.InviteFriendsRequest;
import ru.sportikus.notification.dto.InviteFriendsResponse;
import ru.sportikus.notification.dto.NotificationListResponse;
import ru.sportikus.notification.service.EventInviteService;
import ru.sportikus.notification.service.NotificationService;
import ru.sportikus.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Центр уведомлений пользователя и приглашения друзей")
public class NotificationController {

    private final NotificationService notificationService;
    private final EventInviteService eventInviteService;

    @GetMapping("/me/notifications")
    @Operation(summary = "Получить список уведомлений и количество непрочитанных",
            description = "Типы: `EVENT_INVITE` (приглашение друга), `PARTICIPATION_CONFIRMED` и `PARTICIPATION_REJECTED` (решение организатора), "
                    + "`FRIEND_REQUEST` и `FRIEND_ACCEPTED`, `WAITLIST_SPOT_AVAILABLE` и `WAITLIST_SPOT_TAKEN` (очередь). "
                    + "У каждого есть `linkUrl` — куда перейти в приложении. Свежие — первыми.")
    public NotificationListResponse getNotifications() {
        return notificationService.getNotifications(CurrentUser.require());
    }

    @PatchMapping("/me/notifications/{id}/read")
    @Operation(summary = "Отметить уведомление как прочитанное")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(CurrentUser.require(), id);
    }

    @PostMapping("/me/notifications/read-all")
    @Operation(summary = "Отметить все уведомления как прочитанные")
    public void markAllAsRead() {
        notificationService.markAllAsRead(CurrentUser.require());
    }

    @GetMapping("/events/{id}/invite/friends")
    @Operation(summary = "Мои друзья для приглашения на мероприятие",
            description = "Подтверждённые друзья по алфавиту с состоянием: `AVAILABLE` — можно позвать, "
                    + "`INVITED` — вы уже звали его на это мероприятие, `PARTICIPATING` — он уже записан, подал заявку, "
                    + "стоит в очереди или сам организует мероприятие.")
    public List<InviteFriendResponse> inviteFriendsList(@PathVariable Long id) {
        return eventInviteService.friends(CurrentUser.require(), id);
    }

    @PostMapping("/events/{id}/invite")
    @Operation(summary = "Пригласить друзей на мероприятие (отправляет уведомления)",
            description = "Каждый приглашённый получает уведомление `EVENT_INVITE` со ссылкой на мероприятие и необязательным "
                    + "сообщением (до 300 символов, не больше 50 друзей за раз).\n\n"
                    + "Звать можно только подтверждённых друзей; остальные идентификаторы молча пропускаются. "
                    + "Не отправляется повторно: тем, кого вы уже звали на это мероприятие (`alreadyInvitedIds`), "
                    + "и тем, кто уже идёт или организует его (`alreadyParticipatingIds`).\n\n"
                    + "`409`, если мероприятие не опубликовано, уже прошло или приём заявок закрыт.")
    public InviteFriendsResponse inviteFriends(
            @PathVariable Long id,
            @Valid @RequestBody InviteFriendsRequest req
    ) {
        return eventInviteService.invite(CurrentUser.require(), id, req);
    }
}
