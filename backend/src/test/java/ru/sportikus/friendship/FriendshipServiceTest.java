package ru.sportikus.friendship;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import ru.sportikus.common.ApiException;
import ru.sportikus.friendship.dto.FriendshipState;
import ru.sportikus.friendship.model.Friendship;
import ru.sportikus.friendship.model.FriendshipStatus;
import ru.sportikus.friendship.repository.FriendshipRepository;
import ru.sportikus.friendship.service.FriendshipService;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FriendshipServiceTest {
    private static final AuthUser IVAN = new AuthUser(1L, "user@sport.ru", "ROLE_USER");
    @Mock FriendshipRepository friendships;
    // default-методы репозитория (require*) работают по-настоящему поверх застабленных find*
    @Mock(answer = Answers.CALLS_REAL_METHODS) UserRepository users;
    @Mock ru.sportikus.organization.repository.OrganizationRepository organizations;
    @Mock ru.sportikus.notification.service.NotificationService notifications;
    FriendshipService service;

    @BeforeEach
    void setUp() {
        service = new FriendshipService(friendships, users, organizations, notifications);
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).fullName("Иван").role("ROLE_USER").build()));
        when(users.findById(2L)).thenReturn(Optional.of(User.builder().id(2L).fullName("Ольга").role("ROLE_USER").build()));
        when(users.getReferenceById(1L)).thenReturn(User.builder().id(1L).fullName("Иван").role("ROLE_USER").build());
        when(friendships.findBetween(1L, 2L)).thenReturn(Optional.empty());
    }

    @Test
    void sendsRequestAndReportsOutgoingState() {
        assertThat(service.request(IVAN, 2L).state()).isEqualTo(FriendshipState.OUTGOING_PENDING);
        verify(friendships).save(any(Friendship.class));
    }

    @Test
    void blocksSelfDuplicateAndAdminFriendships() {
        assertThatThrownBy(() -> service.request(IVAN, 1L)).isInstanceOf(ApiException.class);
        when(friendships.findBetween(1L, 2L)).thenReturn(Optional.of(Friendship.builder().build()));
        assertThatThrownBy(() -> service.request(IVAN, 2L)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.request(new AuthUser(6L, "admin@sport.ru", "ROLE_ADMIN"), 2L)).isInstanceOf(ApiException.class);
    }

    @Test
    void organizationsCannotBeFriends() {
        when(users.findById(3L)).thenReturn(Optional.of(User.builder().id(3L).fullName("Клуб").role("ROLE_ORGANIZER").build()));
        assertThatThrownBy(() -> service.request(IVAN, 3L)).isInstanceOf(ApiException.class).hasMessageContaining("подписаться");
        assertThatThrownBy(() -> service.request(new AuthUser(3L, "club@sport.ru", "ROLE_ORGANIZER"), 2L))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void searchReturnsOrganizationIdInsteadOfFriendState() {
        User club = User.builder().id(3L).fullName("Клуб").email("club@sport.ru").role("ROLE_ORGANIZER").build();
        when(users.findByEmailIgnoreCase("club@sport.ru")).thenReturn(Optional.of(club));
        when(organizations.findFirstByOwnerIdOrderByIdAsc(3L)).thenReturn(Optional.of(
                ru.sportikus.organization.model.Organization.builder().id(7L).status("APPROVED").build()));
        var found = service.search(IVAN, "club@sport.ru");
        assertThat(found.organizationId()).isEqualTo(7L);
        assertThat(found.state()).isEqualTo(FriendshipState.NONE);
    }

    @Test
    void acceptsOnlyIncomingPendingRequest() {
        Friendship request = Friendship.builder()
                .requester(User.builder().id(2L).build()).recipient(User.builder().id(1L).build())
                .status(FriendshipStatus.PENDING).build();
        when(friendships.findBetween(1L, 2L)).thenReturn(Optional.of(request));
        assertThat(service.accept(IVAN, 2L).state()).isEqualTo(FriendshipState.FRIENDS);
        assertThat(request.getStatus()).isEqualTo(FriendshipStatus.ACCEPTED);
        assertThat(request.getAcceptedAt()).isNotNull();
    }

    @Test
    void stateDistinguishesIncomingOutgoingAndFriends() {
        Friendship f = Friendship.builder().requester(User.builder().id(1L).build())
                .recipient(User.builder().id(2L).build()).status(FriendshipStatus.PENDING).build();
        when(friendships.findBetween(1L, 2L)).thenReturn(Optional.of(f));
        assertThat(service.state(1L, 2L)).isEqualTo(FriendshipState.OUTGOING_PENDING);
        assertThat(service.state(2L, 1L)).isEqualTo(FriendshipState.INCOMING_PENDING);
        f.setStatus(FriendshipStatus.ACCEPTED);
        assertThat(service.state(1L, 2L)).isEqualTo(FriendshipState.FRIENDS);
    }
}
