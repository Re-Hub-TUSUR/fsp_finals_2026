package ru.sportikus.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventAccess;
import ru.sportikus.friendship.model.Friendship;
import ru.sportikus.friendship.model.FriendshipStatus;
import ru.sportikus.friendship.repository.FriendshipRepository;
import ru.sportikus.notification.dto.InviteFriendResponse;
import ru.sportikus.notification.dto.InviteFriendResponse.InviteState;
import ru.sportikus.notification.dto.InviteFriendsRequest;
import ru.sportikus.notification.dto.InviteFriendsResponse;
import ru.sportikus.notification.model.NotificationType;
import ru.sportikus.notification.repository.NotificationRepository;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Приглашения друзей на мероприятие: приглашённый получает уведомление EVENT_INVITE со ссылкой на событие.
 * Одного друга на одно мероприятие одним человеком зовут один раз; уже участвующих не зовут.
 */
@Service
@RequiredArgsConstructor
public class EventInviteService {

    /** Статусы, при которых человек уже «идёт» и приглашение ему ни к чему. */
    static final Set<ParticipationStatus> ACTIVE =
            EnumSet.of(ParticipationStatus.PENDING, ParticipationStatus.CONFIRMED, ParticipationStatus.WAITLISTED);

    private final EventRepository eventRepository;
    private final FriendshipRepository friendshipRepository;
    private final ParticipationRepository participationRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /** Мои друзья для окна «Позвать друзей»: кого можно позвать, кто уже приглашён, кто уже идёт. */
    @Transactional(readOnly = true)
    public List<InviteFriendResponse> friends(AuthUser auth, Long eventId) {
        Event event = load(eventId);
        Map<Long, User> friends = friendsOf(auth.id());
        Set<Long> participating = participating(event, friends.keySet());
        Set<Long> invited = alreadyInvited(auth.id(), eventId, friends.keySet());
        return friends.values().stream()
                .sorted(Comparator.comparing(User::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(f -> new InviteFriendResponse(f.getId(), f.getFullName(), f.getAvatarUrl(),
                        participating.contains(f.getId()) ? InviteState.PARTICIPATING
                                : invited.contains(f.getId()) ? InviteState.INVITED
                                : InviteState.AVAILABLE))
                .toList();
    }

    @Transactional
    public InviteFriendsResponse invite(AuthUser auth, Long eventId, InviteFriendsRequest req) {
        Event event = load(eventId);
        Instant now = Instant.now();
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw ApiException.conflict("Позвать друзей можно только на опубликованное мероприятие");
        }
        if (!now.isBefore(event.getEndTime())) {
            throw ApiException.conflict("Мероприятие уже прошло");
        }
        if (!now.isBefore(event.registrationClosesAt())) {
            throw ApiException.conflict("Приём заявок на мероприятие закрыт — звать друзей уже поздно");
        }

        Map<Long, User> friends = friendsOf(auth.id());
        Set<Long> requested = new LinkedHashSet<>(req.friendIds());
        requested.retainAll(friends.keySet()); // не друзья (и сам отправитель) молча пропускаются
        Set<Long> participating = participating(event, requested);
        Set<Long> invited = alreadyInvited(auth.id(), eventId, requested);

        User sender = userRepository.findById(auth.id())
                .orElseThrow(() -> ApiException.unauthorized("Пользователь не найден, войдите заново"));
        String note = req.message() == null || req.message().isBlank() ? "" : " «" + req.message().trim() + "»";

        List<Long> sent = new ArrayList<>();
        List<Long> skippedInvited = new ArrayList<>();
        List<Long> skippedParticipating = new ArrayList<>();
        for (Long friendId : requested) {
            if (participating.contains(friendId)) {
                skippedParticipating.add(friendId);
            } else if (invited.contains(friendId)) {
                skippedInvited.add(friendId);
            } else {
                notificationService.create(friends.get(friendId), NotificationType.EVENT_INVITE,
                        sender.getFullName() + " приглашает вас на мероприятие",
                        sender.getFullName() + " приглашает вас на «" + event.getTitle() + "»." + note,
                        "/events/" + event.getId(), sender, event);
                sent.add(friendId);
            }
        }
        return new InviteFriendsResponse(sent.size(), sent, skippedInvited, skippedParticipating);
    }

    private Event load(Long eventId) {
        return eventRepository.requireDetailed(eventId);
    }

    /** Подтверждённые друзья пользователя: id → пользователь. */
    private Map<Long, User> friendsOf(Long userId) {
        Map<Long, User> result = new LinkedHashMap<>();
        for (Friendship f : friendshipRepository.findByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED)) {
            User friend = f.getRequester().getId().equals(userId) ? f.getRecipient() : f.getRequester();
            result.put(friend.getId(), friend);
        }
        return result;
    }

    /** Друзья, которые уже идут на мероприятие или сами его организуют. */
    private Set<Long> participating(Event event, Set<Long> userIds) {
        Set<Long> result = new HashSet<>();
        if (userIds.isEmpty()) {
            return result;
        }
        result.addAll(participationRepository.findUserIdsByEventAndStatuses(event.getId(), userIds, ACTIVE));
        userIds.stream().filter(id -> EventAccess.isManager(event, id)).forEach(result::add);
        return result;
    }

    private Set<Long> alreadyInvited(Long senderId, Long eventId, Set<Long> userIds) {
        return userIds.isEmpty() ? Set.of()
                : new HashSet<>(notificationRepository.findRecipientIds(NotificationType.EVENT_INVITE, senderId, eventId, userIds));
    }

}
