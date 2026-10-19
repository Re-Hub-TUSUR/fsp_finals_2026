package ru.sportikus.friendship.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.friendship.dto.FriendRequestResponse;
import ru.sportikus.friendship.dto.FriendResponse;
import ru.sportikus.friendship.dto.FriendshipResponse;
import ru.sportikus.friendship.dto.FriendshipState;
import ru.sportikus.friendship.model.Friendship;
import ru.sportikus.friendship.model.FriendshipStatus;
import ru.sportikus.friendship.repository.FriendshipRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendshipService {
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    @Transactional
    public FriendshipResponse request(AuthUser auth, Long userId) {
        rejectAdmin(auth);
        User target = target(auth, userId);
        Friendship existing = friendshipRepository.findBetween(auth.id(), userId).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == FriendshipStatus.PENDING && existing.getRecipient() != null
                    && existing.getRecipient().getId().equals(auth.id())) {
                throw ApiException.conflict("Есть встречная заявка — примите или отклоните её");
            }
            throw ApiException.conflict("Заявка в друзья или дружба уже существует");
        }
        User requester = userRepository.getReferenceById(auth.id());
        friendshipRepository.save(Friendship.builder().requester(requester).recipient(target).build());
        return new FriendshipResponse(userId, FriendshipState.OUTGOING_PENDING);
    }

    @Transactional
    public FriendshipResponse accept(AuthUser auth, Long userId) {
        rejectAdmin(auth);
        Friendship friendship = pendingIncoming(auth.id(), userId);
        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendship.setAcceptedAt(Instant.now());
        return new FriendshipResponse(userId, FriendshipState.FRIENDS);
    }

    @Transactional
    public void reject(AuthUser auth, Long userId) {
        rejectAdmin(auth);
        friendshipRepository.delete(pendingIncoming(auth.id(), userId));
    }

    @Transactional
    public void remove(AuthUser auth, Long userId) {
        rejectAdmin(auth);
        Friendship friendship = friendshipRepository.findBetween(auth.id(), userId)
                .orElseThrow(() -> ApiException.notFound("Заявка в друзья или дружба не найдена"));
        if (friendship.getStatus() == FriendshipStatus.PENDING && !friendship.getRequester().getId().equals(auth.id())) {
            throw ApiException.forbidden("Входящую заявку можно принять или отклонить");
        }
        friendshipRepository.delete(friendship);
    }

    @Transactional(readOnly = true)
    public List<FriendRequestResponse> incoming(AuthUser auth) {
        rejectAdmin(auth);
        return friendshipRepository.findByRecipientIdAndStatusOrderByCreatedAtAsc(auth.id(), FriendshipStatus.PENDING).stream()
                .map(f -> new FriendRequestResponse(f.getRequester().getId(), f.getRequester().getFullName(),
                        f.getRequester().getAvatarUrl(), f.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FriendResponse> friends(AuthUser auth) {
        rejectAdmin(auth);
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
        User target = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Пользователь не найден"));
        if ("ROLE_ADMIN".equals(target.getRole())) throw ApiException.forbidden("Администратор не участвует в дружбе");
        return target;
    }

    private static void rejectAdmin(AuthUser auth) {
        if (auth.isAdmin()) throw ApiException.forbidden("Администратор не участвует в дружбе");
    }
}
