package ru.sportikus.friendship.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.friendship.dto.FriendRequestResponse;
import ru.sportikus.friendship.dto.FriendResponse;
import ru.sportikus.friendship.dto.FriendSearchResponse;
import ru.sportikus.friendship.dto.FriendshipResponse;
import ru.sportikus.friendship.dto.FriendshipState;
import ru.sportikus.friendship.model.Friendship;
import ru.sportikus.friendship.model.FriendshipStatus;
import ru.sportikus.friendship.repository.FriendshipRepository;
import ru.sportikus.organization.model.OrganizationStatus;
import ru.sportikus.organization.repository.OrganizationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.security.Roles;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendshipService {
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ru.sportikus.notification.service.NotificationService notificationService;

    @Transactional
    public FriendshipResponse request(AuthUser auth, Long userId) {
        rejectNonUser(auth);
        User target = target(auth, userId);
        Friendship existing = friendshipRepository.findBetween(auth.id(), userId).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == FriendshipStatus.PENDING && existing.getRecipient() != null
                    && existing.getRecipient().getId().equals(auth.id())) {
                throw ApiException.conflict("Есть встречная заявка — примите или отклоните её");
            }
            throw ApiException.conflict("Заявка в друзья или дружба уже существует");
        }
        User requester = userRepository.findById(auth.id())
                .orElseThrow(() -> ApiException.unauthorized("Пользователь не найден"));
        friendshipRepository.save(Friendship.builder().requester(requester).recipient(target).build());
        notificationService.notifyFriendRequest(requester, target);
        return new FriendshipResponse(userId, FriendshipState.OUTGOING_PENDING);
    }

    @Transactional
    public FriendshipResponse accept(AuthUser auth, Long userId) {
        rejectNonUser(auth);
        Friendship friendship = pendingIncoming(auth.id(), userId);
        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendship.setAcceptedAt(Instant.now());
        notificationService.notifyFriendAccepted(friendship.getRecipient(), friendship.getRequester());
        return new FriendshipResponse(userId, FriendshipState.FRIENDS);
    }

    @Transactional
    public void reject(AuthUser auth, Long userId) {
        rejectNonUser(auth);
        friendshipRepository.delete(pendingIncoming(auth.id(), userId));
    }

    @Transactional
    public void remove(AuthUser auth, Long userId) {
        rejectNonUser(auth);
        Friendship friendship = friendshipRepository.findBetween(auth.id(), userId)
                .orElseThrow(() -> ApiException.notFound("Заявка в друзья или дружба не найдена"));
        if (friendship.getStatus() == FriendshipStatus.PENDING && !friendship.getRequester().getId().equals(auth.id())) {
            throw ApiException.forbidden("Входящую заявку можно принять или отклонить");
        }
        friendshipRepository.delete(friendship);
    }

    @Transactional(readOnly = true)
    public List<FriendRequestResponse> incoming(AuthUser auth) {
        rejectNonUser(auth);
        return friendshipRepository.findByRecipientIdAndStatusOrderByCreatedAtAsc(auth.id(), FriendshipStatus.PENDING).stream()
                .map(f -> new FriendRequestResponse(f.getRequester().getId(), f.getRequester().getFullName(),
                        f.getRequester().getAvatarUrl(), f.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FriendResponse> friends(AuthUser auth) {
        rejectNonUser(auth);
        return friendshipRepository.findByUserIdAndStatus(auth.id(), FriendshipStatus.ACCEPTED).stream()
                .map(friendship -> {
                    User friend = friendship.getRequester().getId().equals(auth.id())
                            ? friendship.getRecipient()
                            : friendship.getRequester();
                    return new FriendResponse(friend.getId(), friend.getFullName(), friend.getAvatarUrl(), friendship.getAcceptedAt());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public FriendSearchResponse search(AuthUser auth, String email) {
        rejectNonUser(auth);
        String normalized = email == null ? "" : email.trim();
        if (normalized.isBlank()) throw ApiException.badRequest("Введите электронную почту");
        User user = userRepository.findByEmailIgnoreCase(normalized)
                .filter(candidate -> !candidate.getId().equals(auth.id()))
                .filter(candidate -> !Roles.ADMIN.equals(candidate.getRole()))
                .orElseThrow(() -> ApiException.notFound("Пользователь с такой почтой не найден"));
        // Организация — не друг: отдаём id для подписки, состояния дружбы нет
        Long organizationId = Roles.ORGANIZER.equals(user.getRole())
                ? organizationRepository.findFirstByOwnerIdOrderByIdAsc(user.getId())
                        .filter(org -> OrganizationStatus.APPROVED.equals(org.getStatus()))
                        .map(org -> org.getId()).orElse(null)
                : null;
        return new FriendSearchResponse(user.getId(), user.getFullName(), user.getEmail(), user.getAvatarUrl(),
                organizationId != null ? FriendshipState.NONE : state(auth.id(), user.getId()), organizationId);
    }

    @Transactional(readOnly = true)
    public FriendshipState state(Long viewerId, Long profileUserId) {
        if (viewerId == null || viewerId.equals(profileUserId)) return FriendshipState.NONE;
        Long firstId = Math.min(viewerId, profileUserId);
        Long secondId = Math.max(viewerId, profileUserId);
        return friendshipRepository.findBetween(firstId, secondId).map(f -> {
            if (f.getStatus() == FriendshipStatus.ACCEPTED) return FriendshipState.FRIENDS;
            return f.getRequester().getId().equals(viewerId) ? FriendshipState.OUTGOING_PENDING : FriendshipState.INCOMING_PENDING;
        }).orElse(FriendshipState.NONE);
    }

    private Friendship pendingIncoming(Long recipientId, Long requesterId) {
        return friendshipRepository.findBetween(recipientId, requesterId)
                .filter(f -> f.getStatus() == FriendshipStatus.PENDING && f.getRecipient().getId().equals(recipientId))
                .orElseThrow(() -> ApiException.notFound("Входящая заявка в друзья не найдена"));
    }

    private User target(AuthUser auth, Long userId) {
        if (auth.id().equals(userId)) throw ApiException.badRequest("Нельзя добавить себя в друзья");
        User target = userRepository.require(userId);
        if (Roles.ADMIN.equals(target.getRole())) throw ApiException.forbidden("Администратор не участвует в дружбе");
        if (Roles.ORGANIZER.equals(target.getRole())) {
            throw ApiException.forbidden("Дружба доступна только между пользователями — на организацию можно подписаться");
        }
        return target;
    }

    private static void rejectNonUser(AuthUser auth) {
        if (auth.isAdmin()) throw ApiException.forbidden("Администратор не участвует в дружбе");
        if (auth.isOrganizer()) throw ApiException.forbidden("Организация не участвует в дружбе");
    }
}
