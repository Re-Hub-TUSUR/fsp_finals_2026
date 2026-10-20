package ru.sportikus.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.event.model.Event;
import ru.sportikus.notification.dto.NotificationListResponse;
import ru.sportikus.notification.dto.NotificationResponse;
import ru.sportikus.notification.model.Notification;
import ru.sportikus.notification.model.NotificationType;
import ru.sportikus.notification.repository.NotificationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public NotificationListResponse getNotifications(AuthUser auth) {
        long unread = notificationRepository.countByUserIdAndReadFalse(auth.id());
        List<NotificationResponse> items = notificationRepository.findRecentByUserId(auth.id())
                .stream()
                .map(NotificationResponse::from)
                .toList();
        return new NotificationListResponse(unread, items);
    }

    @Transactional
    public void markAllAsRead(AuthUser auth) {
        notificationRepository.markAllAsRead(auth.id());
    }

    @Transactional
    public void markAsRead(AuthUser auth, Long id) {
        notificationRepository.markAsRead(id, auth.id());
    }

    @Transactional
    public Notification create(User user, NotificationType type, String title, String message,
                               String linkUrl, User sender, Event event) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .linkUrl(linkUrl)
                .senderUser(sender)
                .event(event)
                .read(false)
                .createdAt(Instant.now())
                .build();
        return notificationRepository.save(notification);
    }

    @Transactional
    public void notifyParticipationDecision(User participant, Event event, boolean confirmed, String comment) {
        if (confirmed) {
            create(
                    participant,
                    NotificationType.PARTICIPATION_CONFIRMED,
                    "Заявка одобрена!",
                    "Организатор подтвердил ваше участие в «" + event.getTitle() + "». Ваш QR-билет готов к сканированию на входе.",
                    "/events/" + event.getId(),
                    null,
                    event
            );
        } else {
            String reasonText = (comment != null && !comment.isBlank()) ? " Причина: " + comment.trim() : "";
            create(
                    participant,
                    NotificationType.PARTICIPATION_REJECTED,
                    "Заявка отклонена",
                    "Ваша заявка на участие в «" + event.getTitle() + "» была отклонена организатором." + reasonText,
                    "/events/" + event.getId(),
                    null,
                    event
            );
        }
    }

    /** В мероприятии освободилось место — оповещаем очередь; место получит тот, кто откликнется первым. */
    @Transactional
    public void notifyWaitlistSpot(User waiting, Event event) {
        create(
                waiting,
                NotificationType.WAITLIST_SPOT_AVAILABLE,
                "Освободилось место!",
                "На «" + event.getTitle() + "» освободилось место. Успейте занять его первым.",
                "/events/" + event.getId(),
                null,
                event
        );
    }

    @Transactional
    public void notifyWaitlistSpotTaken(User waiting, Event event) {
        create(
                waiting,
                NotificationType.WAITLIST_SPOT_TAKEN,
                "Место заняли",
                "Освободившееся место на «" + event.getTitle() + "» уже занял другой участник. Вы остаётесь в очереди.",
                "/events/" + event.getId(),
                null,
                event
        );
    }

    @Transactional
    public void notifyFriendRequest(User requester, User recipient) {
        create(
                recipient,
                NotificationType.FRIEND_REQUEST,
                "Новая заявка в друзья",
                requester.getFullName() + " хочет добавить вас в друзья.",
                "/profiles/users/" + requester.getId(),
                requester,
                null
        );
    }

    @Transactional
    public void notifyFriendAccepted(User recipient, User requester) {
        create(
                requester,
                NotificationType.FRIEND_ACCEPTED,
                "Заявка в друзья принята",
                recipient.getFullName() + " принял(а) вашу заявку в друзья.",
                "/profiles/users/" + recipient.getId(),
                recipient,
                null
        );
    }
}
