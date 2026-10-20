package ru.sportikus.participation;

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
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.participation.dto.CheckInResponse;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.participation.service.CheckInService;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CheckInServiceTest {

    private static final long EVENT_ID = 10L;
    private static final AuthUser ORGANIZER = new AuthUser(1L, "user@sport.ru", "ROLE_USER");
    private static final AuthUser STRANGER = new AuthUser(3L, "pro@sport.ru", "ROLE_USER");
    private static final AuthUser ADMIN = new AuthUser(6L, "admin@sport.ru", "ROLE_ADMIN");

    @Mock(answer = Answers.CALLS_REAL_METHODS) EventRepository eventRepository;
    @Mock ParticipationRepository participationRepository;
    @Mock UserRepository userRepository;

    CheckInService service;
    Event event;
    User olga;

    @BeforeEach
    void setUp() {
        service = new CheckInService(eventRepository, participationRepository, userRepository);
        event = Event.builder().id(EVENT_ID).title("Футбол").price(new BigDecimal("300"))
                .organizerUser(User.builder().id(1L).fullName("Иван").build()).build();
        olga = User.builder().id(2L).fullName("Ольга").build();
        when(eventRepository.findDetailedById(EVENT_ID)).thenReturn(Optional.of(event));
        when(participationRepository.save(any(Participation.class))).thenAnswer(i -> i.getArgument(0));
    }

    private Participation ticket(Event of, ParticipationStatus status) {
        Participation p = Participation.builder().id(5L).event(of).user(olga).status(status).ticketCode("SPT-ABCD1234").build();
        when(participationRepository.findByTicketCode("SPT-ABCD1234")).thenReturn(Optional.of(p));
        return p;
    }

    @Test
    void admitsConfirmedParticipantOnceAndNormalizesTheCode() {
        Participation p = ticket(event, ParticipationStatus.CONFIRMED);

        CheckInResponse r = service.checkIn(ORGANIZER, EVENT_ID, "  spt-abcd1234 ");

        assertThat(r.success()).isTrue();
        assertThat(r.status()).isEqualTo("SUCCESS");
        assertThat(r.isPaid()).isTrue();
        assertThat(p.isCheckedIn()).isTrue();
        assertThat(p.getCheckedInAt()).isNotNull();
    }

    @Test
    void secondScanReportsTheFirstCheckIn() {
        Participation p = ticket(event, ParticipationStatus.CONFIRMED);
        Instant first = Instant.parse("2026-10-20T12:00:00Z");
        p.setCheckedIn(true);
        p.setCheckedInAt(first);

        CheckInResponse r = service.checkIn(ORGANIZER, EVENT_ID, "SPT-ABCD1234");

        assertThat(r.status()).isEqualTo("ALREADY_CHECKED_IN");
        assertThat(r.checkedInAt()).isEqualTo(first);
        verify(participationRepository, never()).save(any());
    }

    @Test
    void rejectsTicketsOfOtherEventsUnconfirmedAndUnknownCodes() {
        Event other = Event.builder().id(99L).title("Волейбол").build();
        ticket(other, ParticipationStatus.CONFIRMED);
        assertThat(service.checkIn(ORGANIZER, EVENT_ID, "SPT-ABCD1234").status()).isEqualTo("WRONG_EVENT");

        ticket(event, ParticipationStatus.PENDING);
        assertThat(service.checkIn(ORGANIZER, EVENT_ID, "SPT-ABCD1234").status()).isEqualTo("NOT_CONFIRMED");

        assertThat(service.checkIn(ORGANIZER, EVENT_ID, "SPT-00000000").status()).isEqualTo("NOT_FOUND");
        assertThat(service.checkIn(ORGANIZER, EVENT_ID, " ").status()).isEqualTo("NOT_FOUND");
    }

    @Test
    void onlyTheOrganizerOrAdminCanScan() {
        assertThatThrownBy(() -> service.checkIn(STRANGER, EVENT_ID, "SPT-ABCD1234"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("только организатор");

        ticket(event, ParticipationStatus.CONFIRMED);
        assertThat(service.checkIn(ADMIN, EVENT_ID, "SPT-ABCD1234").success()).isTrue();
    }
}
