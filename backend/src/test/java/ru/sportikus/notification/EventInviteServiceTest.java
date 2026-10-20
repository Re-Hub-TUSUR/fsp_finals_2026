package ru.sportikus.notification;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.friendship.model.Friendship;
import ru.sportikus.friendship.model.FriendshipStatus;
import ru.sportikus.friendship.repository.FriendshipRepository;
import ru.sportikus.notification.dto.InviteFriendResponse;
import ru.sportikus.notification.dto.InviteFriendResponse.InviteState;
import ru.sportikus.notification.dto.InviteFriendsRequest;
import ru.sportikus.notification.dto.InviteFriendsResponse;
import ru.sportikus.notification.model.NotificationType;
import ru.sportikus.notification.repository.NotificationRepository;
import ru.sportikus.notification.service.EventInviteService;
import ru.sportikus.notification.service.NotificationService;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EventInviteServiceTest {

    private static final AuthUser IVAN_AUTH = new AuthUser(1L, "user@sport.ru", "ROLE_USER");
    private static final User IVAN = User.builder().id(1L).fullName("Иван Иванов").role("ROLE_USER").build();
    private static final User OLGA = User.builder().id(2L).fullName("Ольга Новичкова").role("ROLE_USER").build();
    private static final User ALEXEY = User.builder().id(3L).fullName("Алексей Профи").role("ROLE_USER").build();
    private static final User DMITRY = User.builder().id(8L).fullName("Дмитрий Бегунов").role("ROLE_USER").build();

    // default-методы репозитория (require*) работают по-настоящему поверх застабленных find*
    @Mock(answer = Answers.CALLS_REAL_METHODS) EventRepository events;
    @Mock FriendshipRepository friendships;
    @Mock ParticipationRepository participations;
    @Mock NotificationRepository notifications;
    @Mock NotificationService notificationService;
    // default-методы репозитория (require*) работают по-настоящему поверх застабленных find*
    @Mock(answer = Answers.CALLS_REAL_METHODS) UserRepository users;
    EventInviteService service;
    Event event;

    @BeforeEach
    void setUp() {
        service = new EventInviteService(events, friendships, participations, notifications, notificationService, users);
        event = Event.builder().id(8L).title("Велопрогулка").organizerUser(DMITRY).status(EventStatus.PUBLISHED)
                .startTime(Instant.now().plus(2, ChronoUnit.DAYS)).endTime(Instant.now().plus(2, ChronoUnit.DAYS).plus(2, ChronoUnit.HOURS))
                .build();
        when(events.findDetailedById(8L)).thenReturn(Optional.of(event));
        when(users.findById(1L)).thenReturn(Optional.of(IVAN));
        // Иван дружит с Ольгой, Алексеем и Дмитрием (организатором)
        when(friendships.findByUserIdAndStatus(1L, FriendshipStatus.ACCEPTED)).thenReturn(List.of(
                Friendship.builder().requester(IVAN).recipient(OLGA).status(FriendshipStatus.ACCEPTED).build(),
                Friendship.builder().requester(ALEXEY).recipient(IVAN).status(FriendshipStatus.ACCEPTED).build(),
                Friendship.builder().requester(IVAN).recipient(DMITRY).status(FriendshipStatus.ACCEPTED).build()));
        when(participations.findUserIdsByEventAndStatuses(eq(8L), anyCollection(), anyCollection())).thenReturn(List.of());
        when(notifications.findRecipientIds(eq(NotificationType.EVENT_INVITE), eq(1L), eq(8L), anyCollection())).thenReturn(List.of());
    }

    private static InviteFriendsRequest invite(Long... ids) {
        return new InviteFriendsRequest(List.of(ids), "Поехали вместе?");
    }

    @Test
    void sendsInviteNotificationWithLinkAndMessage() {
        InviteFriendsResponse res = service.invite(IVAN_AUTH, 8L, invite(2L));

        assertThat(res.invitedUserIds()).containsExactly(2L);
        verify(notificationService).create(eq(OLGA), eq(NotificationType.EVENT_INVITE),
                eq("Иван Иванов приглашает вас на мероприятие"),
                eq("Иван Иванов приглашает вас на «Велопрогулка». «Поехали вместе?»"),
                eq("/events/8"), eq(IVAN), eq(event));
    }

    @Test
    void skipsStrangersSelfAndDuplicatesInRequest() {
        InviteFriendsResponse res = service.invite(IVAN_AUTH, 8L, invite(2L, 2L, 1L, 999L));

        assertThat(res.invitedUserIds()).containsExactly(2L);
        verify(notificationService, times(1)).create(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void doesNotInviteTheSameFriendTwice() {
        when(notifications.findRecipientIds(eq(NotificationType.EVENT_INVITE), eq(1L), eq(8L), anyCollection()))
                .thenReturn(List.of(2L));

        InviteFriendsResponse res = service.invite(IVAN_AUTH, 8L, invite(2L, 3L));

        assertThat(res.invitedUserIds()).containsExactly(3L);
        assertThat(res.alreadyInvitedIds()).containsExactly(2L);
        verify(notificationService, never()).create(eq(OLGA), any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsFriendsWhoAlreadyParticipateOrOrganize() {
        when(participations.findUserIdsByEventAndStatuses(eq(8L), anyCollection(), anyCollection())).thenReturn(List.of(3L));

        InviteFriendsResponse res = service.invite(IVAN_AUTH, 8L, invite(2L, 3L, 8L));

        assertThat(res.invitedUserIds()).containsExactly(2L);
        assertThat(res.alreadyParticipatingIds()).containsExactlyInAnyOrder(3L, 8L);
    }

    @Test
    void rejectsInvitesToUnpublishedPastOrClosedEvents() {
        event.setStatus(EventStatus.UNPUBLISHED);
        assertThatThrownBy(() -> service.invite(IVAN_AUTH, 8L, invite(2L))).isInstanceOf(ApiException.class);

        event.setStatus(EventStatus.PUBLISHED);
        event.setRegistrationDeadline(Instant.now().minus(1, ChronoUnit.HOURS));
        assertThatThrownBy(() -> service.invite(IVAN_AUTH, 8L, invite(2L)))
                .isInstanceOf(ApiException.class).hasMessageContaining("Приём заявок");

        event.setRegistrationDeadline(null);
        event.setStartTime(Instant.now().minus(3, ChronoUnit.HOURS));
        event.setEndTime(Instant.now().minus(1, ChronoUnit.HOURS));
        assertThatThrownBy(() -> service.invite(IVAN_AUTH, 8L, invite(2L)))
                .isInstanceOf(ApiException.class).hasMessageContaining("уже прошло");

        verify(notificationService, never()).create(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void friendsListShowsWhoCanBeInvited() {
        when(participations.findUserIdsByEventAndStatuses(eq(8L), anyCollection(), anyCollection())).thenReturn(List.of(3L));
        when(notifications.findRecipientIds(eq(NotificationType.EVENT_INVITE), eq(1L), eq(8L), anyCollection()))
                .thenReturn(List.of(2L));

        List<InviteFriendResponse> list = service.friends(IVAN_AUTH, 8L);

        assertThat(list).extracting(InviteFriendResponse::fullName)
                .containsExactly("Алексей Профи", "Дмитрий Бегунов", "Ольга Новичкова");
        assertThat(list).extracting(InviteFriendResponse::state)
                .containsExactly(InviteState.PARTICIPATING, InviteState.PARTICIPATING, InviteState.INVITED);
    }

    @Test
    void unknownEventIsNotFound() {
        when(events.findDetailedById(anyLong())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.friends(IVAN_AUTH, 404L)).isInstanceOf(ApiException.class);
    }
}
