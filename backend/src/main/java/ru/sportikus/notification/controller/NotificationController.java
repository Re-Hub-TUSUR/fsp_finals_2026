package ru.sportikus.notification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.sportikus.notification.dto.InviteFriendsRequest;
import ru.sportikus.notification.dto.InviteFriendsResponse;
import ru.sportikus.notification.dto.NotificationListResponse;
import ru.sportikus.notification.service.NotificationService;
import ru.sportikus.security.CurrentUser;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Центр уведомлений пользователя и приглашения друзей")
public class NotificationController {

    private final NotificationService notificationService;

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

    @PostMapping("/events/{id}/invite")
    @Operation(summary = "Пригласить друзей на мероприятие (отправляет уведомления)",
            description = "Приглашать можно только подтверждённых друзей и только на опубликованное мероприятие (иначе `409`); "
                    + "остальные идентификаторы молча пропускаются. Ответ — сколько приглашено и кто. Друзья получают `EVENT_INVITE` "
                    + "с необязательным сообщением.")
    public InviteFriendsResponse inviteFriends(
            @PathVariable Long id,
            @Valid @RequestBody InviteFriendsRequest req
    ) {
        return notificationService.inviteFriends(CurrentUser.require(), id, req);
    }
}
