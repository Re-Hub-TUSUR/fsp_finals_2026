package ru.sportikus.participation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
    @Mock ApplicationEventPublisher events;
    @Mock ru.sportikus.preference.repository.UserPreferencesRepository preferences;
    @Mock ru.sportikus.notification.service.NotificationService notificationService;

    ParticipationService service;
    Event event;

    @BeforeEach
    void setUp() {
        service = new ParticipationService(eventRepository, participationRepository, userRepository,
                new FieldValidator(), eventMapper, events, preferences, notificationService);

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
    void organizationAccountCannotJoin() {
        AuthUser org = new AuthUser(5L, "club@sport.ru", "ROLE_ORGANIZER");
        when(userRepository.findById(5L)).thenReturn(Optional.of(User.builder().id(5L).role("ROLE_ORGANIZER").build()));
        assertThatThrownBy(() -> service.join(org, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("Организация");
        verify(participationRepository, never()).save(any(Participation.class));
    }

    private void prefsWithBirthYear(Integer year) {
        when(preferences.findById(2L)).thenReturn(Optional.of(
                ru.sportikus.preference.model.UserPreferences.builder().birthYear(year).build()));
    }

    @Test
    void rejectsUserYoungerThanMinAge() {
        event.setMinAge(10);
        prefsWithBirthYear(java.time.Year.now().getValue() - 6);
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("от 10");
    }

    @Test
    void rejectsUserOlderThanMaxAge() {
        event.setMaxAge(18);
        prefsWithBirthYear(java.time.Year.now().getValue() - 40);
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("до 18");
    }

    @Test
    void ageLimitNeedsBirthYear() {
        event.setMinAge(10);
        when(preferences.findById(2L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("год рождения");
    }

    @Test
    void userInsideAgeRangeJoins() {
        event.setMinAge(10);
        event.setMaxAge(18);
        prefsWithBirthYear(java.time.Year.now().getValue() - 14);
        assertThat(service.join(PARTICIPANT, EVENT_ID, emptyJoin()).status()).isEqualTo(ParticipationStatus.PENDING);
    }

    @Test
    void cannotJoinUnpublishedOrClosedEvent() {
        event.setStatus(EventStatus.UNPUBLISHED);
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("снято с публикации");

        event.setStatus(EventStatus.PUBLISHED);
        event.setRegistrationDeadline(Instant.now().minusSeconds(60));
        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("закрыт");
    }

    // ----------------------------------------------------------------- очередь

    private Participation waiting(long id, long userId, ParticipationStatus status) {
        return Participation.builder().id(id).event(event)
                .user(User.builder().id(userId).fullName("Ждущий " + userId).build()).status(status).build();
    }

    /** Число подтверждённых на последовательных вызовах (если значений несколько). */
    private void seats(long first, long... next) {
        Long[] rest = java.util.Arrays.stream(next).boxed().toArray(Long[]::new);
        when(participationRepository.countByEventIdAndStatus(EVENT_ID, ParticipationStatus.CONFIRMED))
                .thenReturn(first, rest);
    }

    private void queue(Participation... waiters) {
        when(participationRepository.countByEventIdAndStatus(EVENT_ID, ParticipationStatus.WAITLISTED))
                .thenReturn((long) waiters.length);
        when(participationRepository.findByEventIdAndStatusOrderByCreatedAtAsc(EVENT_ID, ParticipationStatus.WAITLISTED))
                .thenReturn(List.of(waiters));
    }

    @Test
    void fullEventPutsApplicantIntoQueueAndKeepsTheAnswers() {
        event.setJoinMode(JoinMode.OPEN);
        seats(2);
        ParticipationResponse r = service.join(PARTICIPANT, EVENT_ID, new JoinRequest("Хочу", null, null));
        assertThat(r.status()).isEqualTo(ParticipationStatus.WAITLISTED);
        assertThat(r.message()).isEqualTo("Хочу");
        assertThat(r.ticketCode()).isNull();
    }

    @Test
    void newcomerDoesNotJumpTheQueueWhenSeatIsFree() {
        event.setJoinMode(JoinMode.OPEN);
        seats(1);
        queue(waiting(31L, 3L, ParticipationStatus.WAITLISTED));
        assertThat(service.join(PARTICIPANT, EVENT_ID, emptyJoin()).status()).isEqualTo(ParticipationStatus.WAITLISTED);
    }

    @Test
    void cancellingConfirmedParticipantNotifiesEveryoneInQueue() {
        Participation leaving = waiting(7L, 2L, ParticipationStatus.CONFIRMED);
        Participation w1 = waiting(31L, 3L, ParticipationStatus.WAITLISTED);
        Participation w2 = waiting(32L, 4L, ParticipationStatus.WAITLISTED);
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.of(leaving));
        seats(1);
        queue(w1, w2);

        service.cancel(PARTICIPANT, EVENT_ID);

        verify(notificationService).notifyWaitlistSpot(w1.getUser(), event);
        verify(notificationService).notifyWaitlistSpot(w2.getUser(), event);
    }

    @Test
    void cancellingPendingRequestDoesNotNotifyTheQueue() {
        Participation pending = waiting(7L, 2L, ParticipationStatus.PENDING);
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.of(pending));
        queue(waiting(31L, 3L, ParticipationStatus.WAITLISTED));

        service.cancel(PARTICIPANT, EVENT_ID);

        verify(notificationService, never()).notifyWaitlistSpot(any(), any());
    }

    @Test
    void queuedUserCanLeaveTheQueueWithoutNotifyingAnyone() {
        Participation w = waiting(7L, 2L, ParticipationStatus.WAITLISTED);
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.of(w));
        queue(w);

        assertThat(service.cancel(PARTICIPANT, EVENT_ID).status()).isEqualTo(ParticipationStatus.CANCELLED);
        verify(notificationService, never()).notifyWaitlistSpot(any(), any());
    }

    @Test
    void organizerRejectingConfirmedParticipantNotifiesTheQueue() {
        Participation confirmed = waiting(7L, 2L, ParticipationStatus.CONFIRMED);
        Participation w = waiting(31L, 3L, ParticipationStatus.WAITLISTED);
        when(participationRepository.findWithUserById(7L)).thenReturn(Optional.of(confirmed));
        seats(1);
        queue(w);

        service.decide(ORGANIZER, EVENT_ID, 7L, new DecisionRequest(ParticipationStatus.REJECTED, null));

        verify(notificationService).notifyWaitlistSpot(w.getUser(), event);
    }

    @Test
    void firstResponderTakesTheFreedSeatInOpenEvent() {
        event.setJoinMode(JoinMode.OPEN);
        Participation me = waiting(7L, 2L, ParticipationStatus.WAITLISTED);
        Participation other = waiting(31L, 3L, ParticipationStatus.WAITLISTED);
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.of(me));
        seats(1, 2);
        queue(me, other);

        ParticipationResponse r = service.join(PARTICIPANT, EVENT_ID, emptyJoin());

        assertThat(r.status()).isEqualTo(ParticipationStatus.CONFIRMED);
        assertThat(r.ticketCode()).isNotNull();
        // место ушло — остальным в очереди сообщают, но сам откликнувшийся без уведомления
        verify(notificationService).notifyWaitlistSpotTaken(me.getUser(), event);
        verify(notificationService).notifyWaitlistSpotTaken(other.getUser(), event);
    }

    @Test
    void claimOnFullEventIsRejectedAsSeatTaken() {
        Participation me = waiting(7L, 2L, ParticipationStatus.WAITLISTED);
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.of(me));
        seats(2);

        assertThatThrownBy(() -> service.join(PARTICIPANT, EVENT_ID, emptyJoin()))
                .isInstanceOf(ApiException.class).hasMessageContaining("заняли");
        assertThat(me.getStatus()).isEqualTo(ParticipationStatus.WAITLISTED);
    }

    @Test
    void claimInApprovalEventSendsARequestToTheOrganizer() {
        Participation me = waiting(7L, 2L, ParticipationStatus.WAITLISTED);
        when(participationRepository.findByEventIdAndUserId(EVENT_ID, 2L)).thenReturn(Optional.of(me));
        seats(1);

        assertThat(service.join(PARTICIPANT, EVENT_ID, emptyJoin()).status()).isEqualTo(ParticipationStatus.PENDING);
        verify(notificationService, never()).notifyWaitlistSpotTaken(any(), any());
    }

    @Test
    void organizerCannotConfirmSomeoneFromTheQueue() {
        Participation w = waiting(7L, 2L, ParticipationStatus.WAITLISTED);
        when(participationRepository.findWithUserById(7L)).thenReturn(Optional.of(w));
        assertThatThrownBy(() -> service.decide(ORGANIZER, EVENT_ID, 7L,
                new DecisionRequest(ParticipationStatus.CONFIRMED, null)))
                .isInstanceOf(ApiException.class).hasMessageContaining("очереди");
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

    @Test
    void organizerExportsCsvSuccessfully() {
        Participation p1 = Participation.builder()
                .id(1L)
                .event(event)
                .user(User.builder().id(2L).fullName("Ольга").email("olga@sport.ru").build())
                .status(ParticipationStatus.CONFIRMED)
                .ticketCode("SPT-12345678")
                .checkedIn(true)
                .checkedInAt(Instant.parse("2026-10-20T12:30:00Z"))
                .message("Буду вовремя")
                .decisionComment("Добро пожаловать")
                .createdAt(Instant.parse("2026-10-20T10:00:00Z"))
                .build();

        when(eventRepository.findDetailedById(EVENT_ID)).thenReturn(Optional.of(event));
        when(participationRepository.findByEventIdOrderByCreatedAtAsc(EVENT_ID)).thenReturn(List.of(p1));

        byte[] csvBytes = service.exportCsv(ORGANIZER, EVENT_ID);
        assertThat(csvBytes).isNotEmpty();

        String csvString = new String(csvBytes, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(csvString).startsWith("\uFEFF");
        assertThat(csvString).contains("№;ФИО;Email;Статус;Дата заявки;Код билета;Отметка о входе;Время входа;Сообщение участника;Комментарий организатора");
        assertThat(csvString).contains("Ольга;olga@sport.ru;Подтверждён");
        assertThat(csvString).contains("SPT-12345678;Явился");
        assertThat(csvString).contains("Буду вовремя");
        assertThat(csvString).contains("Добро пожаловать");
    }

    @Test
    void nonOrganizerCannotExportCsv() {
        when(eventRepository.findDetailedById(EVENT_ID)).thenReturn(Optional.of(event));
        assertThatThrownBy(() -> service.exportCsv(PARTICIPANT, EVENT_ID))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("только организатору");
    }
}
