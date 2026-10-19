package ru.sportikus.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.friendship.model.Friendship;
import ru.sportikus.friendship.model.FriendshipStatus;
import ru.sportikus.friendship.repository.FriendshipRepository;
import ru.sportikus.notification.dto.InviteFriendsRequest;
import ru.sportikus.notification.dto.InviteFriendsResponse;
import ru.sportikus.notification.dto.NotificationListResponse;
import ru.sportikus.notification.dto.NotificationResponse;
import ru.sportikus.notification.model.Notification;
import ru.sportikus.notification.model.NotificationType;
import ru.sportikus.notification.repository.NotificationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;

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
    public InviteFriendsResponse inviteFriends(AuthUser auth, Long eventId, InviteFriendsRequest req) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> ApiException.notFound("Мероприятие не найдено"));

        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw ApiException.conflict("Нельзя пригласить на неопубликованное мероприятие");
        }

        User sender = userRepository.findById(auth.id())
                .orElseThrow(() -> ApiException.unauthorized("Пользователь не найден"));

        // Получаем список подтвержденных друзей пользователя
        List<Friendship> friendships = friendshipRepository.findByUserIdAndStatus(auth.id(), FriendshipStatus.ACCEPTED);
        Set<Long> allowedFriendIds = friendships.stream()
                .map(f -> f.getRequester().getId().equals(auth.id()) ? f.getRecipient().getId() : f.getRequester().getId())
                .collect(Collectors.toSet());

        List<Long> invitedUserIds = new ArrayList<>();
        String customMsg = (req.message() != null && !req.message().isBlank()) ? " «" + req.message().trim() + "»" : "";

        for (Long friendId : req.friendIds()) {
            if (friendId.equals(auth.id())) continue;
            if (!allowedFriendIds.contains(friendId)) {
                log.warn("Пользователь {} попытался пригласить пользователя {}, который не является другом", auth.id(), friendId);
                continue;
            }
            User friend = userRepository.findById(friendId).orElse(null);
            if (friend == null) continue;

            create(
                    friend,
                    NotificationType.EVENT_INVITE,
                    sender.getFullName() + " приглашает вас на мероприятие",
                    sender.getFullName() + " приглашает вас на «" + event.getTitle() + "»." + customMsg,
                    "/events/" + event.getId(),
                    sender,
                    event
            );
            invitedUserIds.add(friendId);
        }

        return new InviteFriendsResponse(invitedUserIds.size(), invitedUserIds);
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
