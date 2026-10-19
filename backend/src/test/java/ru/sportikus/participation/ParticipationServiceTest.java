package ru.sportikus.participation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.OrgDetails;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventMapper;
import ru.sportikus.form.FieldDef;
import ru.sportikus.form.FieldType;
import ru.sportikus.form.FieldValidator;
import ru.sportikus.participation.dto.DecisionRequest;
import ru.sportikus.participation.dto.JoinRequest;
import ru.sportikus.participation.dto.ParticipationResponse;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.participation.service.ParticipationService;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ParticipationServiceTest {

    private static final long EVENT_ID = 10L;
    private static final AuthUser PARTICIPANT = new AuthUser(2L, "olga@sport.ru", "ROLE_USER");
    private static final AuthUser ORGANIZER = new AuthUser(1L, "user@sport.ru", "ROLE_USER");

    @Mock EventRepository eventRepository;
    @Mock ParticipationRepository participationRepository;
    @Mock UserRepository userRepository;
    @Mock EventMapper eventMapper;

    ParticipationService service;
    Event event;

    @BeforeEach
    void setUp() {
        service = new ParticipationService(eventRepository, participationRepository, userRepository,
                new FieldValidator(), eventMapper);

        User author = User.builder().id(1L).fullName("Иван").role("ROLE_USER").build();
        event = Event.builder().id(EVENT_ID).title("Футбол").organizerUser(author)
                .startTime(Instant.now().plus(2, ChronoUnit.HOURS)).endTime(Instant.now().plus(4, ChronoUnit.HOURS))
                .capacity(2).joinMode(JoinMode.APPROVAL).status(EventStatus.PUBLISHED).build();

        when(eventRepository.findForUpdate(EVENT_ID)).thenReturn(Optional.of(event));
        when(userRepository.findById(2L)).thenReturn(Optional.of(User.builder().id(2L).fullName("Ольга").build()));
        when(userRepository.getReferenceById(1L)).thenReturn(author);
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.empty());
        when(participationRepository.countByEventIdAndStatus(EVENT_ID, ParticipationStatus.CONFIRMED)).thenReturn(0L);
        when(participationRepository.save(any(Participation.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static JoinRequest emptyJoin() {
        return new JoinRequest(null, null, null);
    }

    @Test
    void approvalModeCreatesPendingRequest() {
        ParticipationResponse r = service.join(PARTICIPANT, EVENT_ID, emptyJoin());
        assertThat(r.status()).isEqualTo(ParticipationStatus.PENDING);
        assertThat(r.decidedAt()).isNull();
    }

    @Test
    void openModeConfirmsImmediately() {
        event.setJoinMode(JoinMode.OPEN);
        ParticipationResponse r = service.join(PARTICIPANT, EVENT_ID, emptyJoin());
        assertThat(r.status()).isEqualTo(ParticipationStatus.CONFIRMED);
    }

    @Test
    void organizerCannotJoinOwnEvent() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).build()));
        assertThatThrownBy(() -> service.join(ORGANIZER, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("собственное");
    }

    @Test
    void cannotJoinUnpublishedFullOrClosedEvent() {
        event.setStatus(EventStatus.UNPUBLISHED);
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("снято с публикации");

        event.setStatus(EventStatus.PUBLISHED);
        when(participationRepository.countByEventIdAndStatus(EVENT_ID, ParticipationStatus.CONFIRMED)).thenReturn(2L);
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("места заняты");

        when(participationRepository.countByEventIdAndStatus(EVENT_ID, ParticipationStatus.CONFIRMED)).thenReturn(0L);
        event.setRegistrationDeadline(Instant.now().minusSeconds(60));
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("закрыт");
    }

    @Test
    void duplicateAndRejectedApplicationsAreBlockedButCancelledCanRejoin() {
        Participation existing = Participation.builder().id(5L).event(event)
                .user(User.builder().id(2L).fullName("Ольга").build()).status(ParticipationStatus.PENDING).build();
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.of(existing));
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin())).isInstanceOf(ApiException.class);

        existing.setStatus(ParticipationStatus.REJECTED);
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin())).isInstanceOf(ApiException.class);

        existing.setStatus(ParticipationStatus.CANCELLED);
        assertThat(service.join(PARTICIPANT, EVENT_ID, emptyJoin()).status()).isEqualTo(ParticipationStatus.PENDING);
    }

    @Test
    void requirementsMustBeAcknowledgedAndQuestionsAnswered() {
        event.setOrgDetails(new OrgDetails("Мария", "+7", null, null, null, List.of("Паспорт"),
                true, false, null, null, null, null, null));
        event.setRegistrationFields(List.of(
                new FieldDef("team", "Команда", FieldType.TEXT, true, null, null, null, null)));

        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("требованиями");
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, new JoinRequest(null, Map.of(), true)))
                .isInstanceOf(ApiException.class).hasMessageContaining("Команда");

        ParticipationResponse r = service.join(PARTICIPANT, EVENT_ID,
                new JoinRequest("Привет", Map.of("team", "Медведи"), true));
        assertThat(r.answers()).containsEntry("team", "Медведи");
        assertThat(r.message()).isEqualTo("Привет");
    }

    @Test
    void managerConfirmsAndRejectsWithCapacityControl() {
        User applicant = User.builder().id(2L).fullName("Ольга").build();
        Participation pending = Participation.builder().id(7L).event(event).user(applicant)
                .status(ParticipationStatus.PENDING).build();
        when(participationRepository.findWithUserById(7L)).thenReturn(Optional.of(pending));

        ParticipationResponse confirmed = service.decide(ORGANIZER, EVENT_ID, 7L,
                new DecisionRequest(ParticipationStatus.CONFIRMED, null));
        assertThat(confirmed.status()).isEqualTo(ParticipationStatus.CONFIRMED);
        assertThat(confirmed.decidedAt()).isNotNull();

        pending.setStatus(ParticipationStatus.PENDING);
        when(participationRepository.countByEventIdAndStatus(EVENT_ID, ParticipationStatus.CONFIRMED)).thenReturn(2L);
        assertThatThrownBy(() -> service.decide(ORGANIZER, EVENT_ID, 7L,
                new DecisionRequest(ParticipationStatus.CONFIRMED, null)))
                .isInstanceOf(ApiException.class).hasMessageContaining("места заняты");

        ParticipationResponse rejected = service.decide(ORGANIZER, EVENT_ID, 7L,
                new DecisionRequest(ParticipationStatus.REJECTED, "Нет мест в составе"));
        assertThat(rejected.status()).isEqualTo(ParticipationStatus.REJECTED);
        assertThat(rejected.decisionComment()).isEqualTo("Нет мест в составе");
    }

    @Test
    void onlyOrganizerDecidesAndOnlyConfirmedOrRejectedAreAllowed() {
        Participation pending = Participation.builder().id(7L).event(event)
                .user(User.builder().id(2L).build()).status(ParticipationStatus.PENDING).build();
        when(participationRepository.findWithUserById(7L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.decide(PARTICIPANT, EVENT_ID, 7L,
                new DecisionRequest(ParticipationStatus.CONFIRMED, null)))
                .isInstanceOf(ApiException.class).hasMessageContaining("только организатор");
        assertThatThrownBy(() -> service.decide(ORGANIZER, EVENT_ID, 7L,
                new DecisionRequest(ParticipationStatus.CANCELLED, null)))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void participantCancelsOwnApplication() {
        Participation confirmed = Participation.builder().id(7L).event(event)
                .user(User.builder().id(2L).fullName("Ольга").build()).status(ParticipationStatus.CONFIRMED).build();
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.of(confirmed));

        assertThat(service.cancel(PARTICIPANT, EVENT_ID).status()).isEqualTo(ParticipationStatus.CANCELLED);
        assertThatThrownBy(() -> service.cancel(PARTICIPANT, EVENT_ID)).isInstanceOf(ApiException.class);
    }
}
