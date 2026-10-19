package ru.sportikus.participation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventAccess;
import ru.sportikus.event.service.EventMapper;
import ru.sportikus.form.FieldValidator;
import ru.sportikus.participation.ParticipationChangedEvent;
import ru.sportikus.participation.dto.CheckInResponse;
import ru.sportikus.participation.dto.DecisionRequest;
import ru.sportikus.participation.dto.JoinRequest;
import ru.sportikus.participation.dto.ParticipationResponse;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.preference.repository.UserPreferencesRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Участие в мероприятиях.
 *
 * <pre>
 *  OPEN      join ──────────────────────────────▶ CONFIRMED
 *  APPROVAL  join ─▶ PENDING ─ организатор ─▶ CONFIRMED | REJECTED
 *  CONFIRMED ─ организатор ─▶ REJECTED (исключение)      REJECTED ─ организатор ─▶ CONFIRMED
 *  PENDING | CONFIRMED | WAITLISTED ─ участник ─▶ CANCELLED
 *  CANCELLED ─ участник (повторно) ─▶ PENDING | CONFIRMED (или WAITLISTED, если мест нет / есть очередь)
 *  мест нет ─ join ─▶ WAITLISTED ─ место освободилось, участник откликнулся первым ─▶ PENDING | CONFIRMED
 * </pre>
 * Очередь: когда место освобождается, оповещаются все ожидающие, место получает первый откликнувшийся
 * (повторный join из WAITLISTED), остальным приходит «Место заняли». Таймеров нет — неактивный человек
 * очередь не задерживает.
 * Все операции над местами выполняются под блокировкой строки мероприятия, поэтому последнее
 * место не может быть выдано дважды.
 */
@Service
@RequiredArgsConstructor
public class ParticipationService {

    private final EventRepository eventRepository;
    private final ParticipationRepository participationRepository;
    private final UserRepository userRepository;
    private final FieldValidator fieldValidator;
    private final EventMapper eventMapper;
    private final ApplicationEventPublisher events;
    private final UserPreferencesRepository preferencesRepository;
    private final ru.sportikus.notification.service.NotificationService notificationService;

    @Transactional
    public ParticipationResponse join(AuthUser auth, Long eventId, JoinRequest req) {
        Event event = lockEvent(eventId);
        User user = userRepository.findById(auth.id())
                .orElseThrow(() -> ApiException.unauthorized("Пользователь не найден, войдите заново"));
        Instant now = Instant.now();

        if (auth.isAdmin()) {
            throw ApiException.forbidden("Администратор не участвует в мероприятиях");
        }
        if (auth.isOrganizer() || "ROLE_ORGANIZER".equals(user.getRole())) {
            throw ApiException.forbidden("Организация не участвует в мероприятиях — записаться может только пользователь");
        }
        if (EventAccess.isManager(event, user.getId())) {
            throw ApiException.conflict("Нельзя записаться на собственное мероприятие");
        }
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw ApiException.conflict("Мероприятие снято с публикации — запись недоступна");
        }
        if (!now.isBefore(event.getEndTime())) {
            throw ApiException.conflict("Мероприятие уже завершилось");
        }
        if (!now.isBefore(event.registrationClosesAt())) {
            throw ApiException.conflict("Приём заявок закрыт");
        }

        Participation existing = participationRepository.findByEventIdAndUserId(eventId, user.getId()).orElse(null);
        boolean claimingQueue = existing != null && existing.getStatus() == ParticipationStatus.WAITLISTED;
        if (!claimingQueue) {
            checkAge(event, user.getId());
        }
        if (existing != null) {
            switch (existing.getStatus()) {
                case CONFIRMED -> throw ApiException.conflict("Вы уже участвуете в этом мероприятии");
                case PENDING -> throw ApiException.conflict("Ваша заявка уже отправлена и ждёт решения организатора");
                case REJECTED -> throw ApiException.conflict("Организатор отклонил вашу заявку");
                case CANCELLED, WAITLISTED -> { /* записаться заново / откликнуться на освободившееся место */ }
            }
        }

        long confirmed = participationRepository.countByEventIdAndStatus(eventId, ParticipationStatus.CONFIRMED);
        boolean full = confirmed >= event.getCapacity();
        boolean claim = existing != null && existing.getStatus() == ParticipationStatus.WAITLISTED;
        if (claim) {
            return claimSpot(event, user, existing, full, now);
        }

        if (event.requiresAcknowledgement() && !Boolean.TRUE.equals(req.acceptedRequirements())) {
            throw ApiException.badRequest("Подтвердите, что ознакомились с требованиями к участникам");
        }
        Map<String, Object> answers = fieldValidator.validateValues(
                event.getRegistrationFields(), req.answers(), "Анкета участника");

        // Мест нет или уже есть очередь — встаём в неё, чтобы не обгонять ожидающих
        boolean queued = full
                || participationRepository.countByEventIdAndStatus(eventId, ParticipationStatus.WAITLISTED) > 0;
        boolean instant = !queued && event.getJoinMode() == JoinMode.OPEN;
        ParticipationStatus previous = existing == null ? null : existing.getStatus();
        Participation p = existing != null ? existing : Participation.builder().event(event).user(user).build();
        p.setStatus(queued ? ParticipationStatus.WAITLISTED
                : instant ? ParticipationStatus.CONFIRMED : ParticipationStatus.PENDING);
        if (instant && p.getTicketCode() == null) {
            p.setTicketCode(generateTicketCode());
        }
        p.setMessage(blankToNull(req.message()));
        p.setAnswers(new LinkedHashMap<>(answers));
        p.setDecisionComment(null);
        p.setDecidedBy(null);
        p.setDecidedAt(instant ? now : null);
        Participation saved = participationRepository.save(p);
        events.publishEvent(new ParticipationChangedEvent(user.getId(), eventId, previous, saved.getStatus()));
        return ParticipationResponse.withUser(saved);
    }

    /** Возрастное ограничение: возраст считается на дату начала мероприятия по году рождения из профиля. */
    private void checkAge(Event event, Long userId) {
        if (event.getMinAge() == null && event.getMaxAge() == null) {
            return;
        }
        Integer birthYear = preferencesRepository.findById(userId)
                .map(p -> p.getBirthYear()).orElse(null);
        if (birthYear == null) {
            throw ApiException.conflict("У мероприятия есть возрастное ограничение — укажите год рождения в профиле");
        }
        ZoneId zone = event.getTimeZone() != null ? ZoneId.of(event.getTimeZone()) : ZoneId.systemDefault();
        int age = event.getStartTime().atZone(zone).getYear() - birthYear;
        if (event.getMinAge() != null && age < event.getMinAge()) {
            throw ApiException.conflict("Возрастное ограничение мероприятия: от " + event.getMinAge() + " лет");
        }
        if (event.getMaxAge() != null && age > event.getMaxAge()) {
            throw ApiException.conflict("Возрастное ограничение мероприятия: до " + event.getMaxAge() + " лет");
        }
    }

    /** Отклик из очереди: место уже освободилось — занимаем (или подаём заявку), иначе «место заняли». */
    private ParticipationResponse claimSpot(Event event, User user, Participation p, boolean full, Instant now) {
        if (full) {
            throw ApiException.conflict("Место уже заняли");
        }
        boolean instant = event.getJoinMode() == JoinMode.OPEN;
        p.setStatus(instant ? ParticipationStatus.CONFIRMED : ParticipationStatus.PENDING);
        if (instant && p.getTicketCode() == null) {
            p.setTicketCode(generateTicketCode());
        }
        p.setDecidedAt(instant ? now : null);
        Participation saved = participationRepository.save(p);
        events.publishEvent(new ParticipationChangedEvent(user.getId(), event.getId(),
                ParticipationStatus.WAITLISTED, saved.getStatus()));
        if (instant && participationRepository.countByEventIdAndStatus(event.getId(), ParticipationStatus.CONFIRMED)
                >= event.getCapacity()) {
            // Место ушло — остальным в очереди об этом сообщаем
            for (Participation other : participationRepository
                    .findByEventIdAndStatusOrderByCreatedAtAsc(event.getId(), ParticipationStatus.WAITLISTED)) {
                notificationService.notifyWaitlistSpotTaken(other.getUser(), event);
            }
        }
        return ParticipationResponse.withUser(saved);
    }

    /** Освободилось место: оповещаем всех из очереди, место получит первый откликнувшийся. */
    private void offerFreedSeat(Event event) {
        if (event.getStatus() != EventStatus.PUBLISHED || !Instant.now().isBefore(event.registrationClosesAt())) {
            return;
        }
        if (participationRepository.countByEventIdAndStatus(event.getId(), ParticipationStatus.CONFIRMED)
                >= event.getCapacity()) {
            return;
        }
        for (Participation waiting : participationRepository
                .findByEventIdAndStatusOrderByCreatedAtAsc(event.getId(), ParticipationStatus.WAITLISTED)) {
            notificationService.notifyWaitlistSpot(waiting.getUser(), event);
        }
    }

    @Transactional
    public ParticipationResponse cancel(AuthUser auth, Long eventId) {
        Event event = lockEvent(eventId);
        Participation p = participationRepository.findByEventIdAndUserId(eventId, auth.id())
                .orElseThrow(() -> ApiException.notFound("Вы не записаны на это мероприятие"));
        if (p.getStatus() != ParticipationStatus.PENDING && p.getStatus() != ParticipationStatus.CONFIRMED
                && p.getStatus() != ParticipationStatus.WAITLISTED) {
            throw ApiException.conflict("Запись уже неактивна");
        }
        if (!Instant.now().isBefore(event.getEndTime())) {
            throw ApiException.conflict("Мероприятие уже завершилось");
        }
        ParticipationStatus previous = p.getStatus();
        p.setStatus(ParticipationStatus.CANCELLED);
        p.setDecidedAt(null);
        p.setDecidedBy(null);
        Participation saved = participationRepository.save(p);
        events.publishEvent(new ParticipationChangedEvent(auth.id(), eventId, previous, ParticipationStatus.CANCELLED));
        if (previous == ParticipationStatus.CONFIRMED) {
            offerFreedSeat(event);
        }
        return ParticipationResponse.withUser(saved);
    }

    /** Все заявки и участники мероприятия — только для организатора. */
    @Transactional(readOnly = true)
    public List<ParticipationResponse> listForManager(AuthUser auth, Long eventId) {
        Event event = eventRepository.findDetailedById(eventId)
                .orElseThrow(() -> ApiException.notFound("Мероприятие не найдено"));
        if (!EventAccess.isManager(event, auth.id())) {
            throw ApiException.forbidden("Заявки видит только организатор мероприятия");
        }
        return participationRepository.findByEventIdOrderByCreatedAtAsc(eventId).stream()
                .map(ParticipationResponse::withUser)
                .toList();
    }

    @Transactional
    public ParticipationResponse decide(AuthUser auth, Long eventId, Long participationId, DecisionRequest req) {
        Event event = lockEvent(eventId);
        if (!EventAccess.isManager(event, auth.id())) {
            throw ApiException.forbidden("Решения по заявкам принимает только организатор мероприятия");
        }
        Participation p = participationRepository.findWithUserById(participationId)
                .filter(x -> x.getEvent().getId().equals(eventId))
                .orElseThrow(() -> ApiException.notFound("Заявка не найдена"));
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw ApiException.conflict("Мероприятие снято с публикации");
        }
        if (!Instant.now().isBefore(event.getEndTime())) {
            throw ApiException.conflict("Мероприятие уже завершилось");
        }

        ParticipationStatus from = p.getStatus();
        switch (req.decision()) {
            case CONFIRMED -> {
                if (from == ParticipationStatus.CONFIRMED) {
                    throw ApiException.conflict("Участие уже подтверждено");
                }
                if (from == ParticipationStatus.CANCELLED) {
                    throw ApiException.conflict("Участник отменил запись");
                }
                if (from == ParticipationStatus.WAITLISTED) {
                    throw ApiException.conflict("Участник в очереди — место он займёт сам, когда оно освободится");
                }
                long confirmed = participationRepository.countByEventIdAndStatus(eventId, ParticipationStatus.CONFIRMED);
                if (confirmed >= event.getCapacity()) {
                    throw ApiException.conflict("Все места заняты — подтвердить ещё одну заявку нельзя");
                }
            }
            case REJECTED -> {
                if (from != ParticipationStatus.PENDING && from != ParticipationStatus.CONFIRMED) {
                    throw ApiException.conflict("Эту заявку уже нельзя отклонить");
                }
            }
            default -> throw ApiException.badRequest("Допустимые решения: CONFIRMED или REJECTED");
        }

        User manager = userRepository.getReferenceById(auth.id());
        p.setStatus(req.decision());
        if (req.decision() == ParticipationStatus.CONFIRMED && p.getTicketCode() == null) {
            p.setTicketCode(generateTicketCode());
        }
        p.setDecisionComment(blankToNull(req.comment()));
        p.setDecidedAt(Instant.now());
        p.setDecidedBy(manager);
        Participation saved = participationRepository.save(p);
        events.publishEvent(new ParticipationChangedEvent(p.getUser().getId(), eventId, from, req.decision()));
        notificationService.notifyParticipationDecision(p.getUser(), event, req.decision() == ParticipationStatus.CONFIRMED, req.comment());
        if (from == ParticipationStatus.CONFIRMED && req.decision() == ParticipationStatus.REJECTED) {
            offerFreedSeat(event);
        }
        return ParticipationResponse.withUser(saved);
    }

    /** Контроль входа на мероприятие организатором по коду билета (из QR-кода). */
    @Transactional
    public CheckInResponse checkIn(AuthUser auth, Long eventId, String rawTicketCode) {
        Event event = eventRepository.findDetailedById(eventId)
                .orElseThrow(() -> ApiException.notFound("Мероприятие не найдено"));
        if (!EventAccess.isManager(event, auth.id()) && !auth.isAdmin()) {
            throw ApiException.forbidden("Отмечать билеты может только организатор мероприятия");
        }

        boolean isPaid = event.getPrice() != null && event.getPrice().compareTo(java.math.BigDecimal.ZERO) > 0;

        if (rawTicketCode == null || rawTicketCode.isBlank()) {
            return new CheckInResponse(false, "NOT_FOUND", "Код билета не указан",
                    null, null, null, event.getTitle(), isPaid, event.getPrice());
        }
        String code = rawTicketCode.trim().toUpperCase();

        Participation p = participationRepository.findByTicketCode(code).orElse(null);
        if (p == null) {
            return new CheckInResponse(false, "NOT_FOUND",
                    "Билет с кодом «" + code + "» не найден в системе",
                    code, null, null, event.getTitle(), isPaid, event.getPrice());
        }

        ParticipationResponse.Participant participant = new ParticipationResponse.Participant(
                p.getUser().getId(), p.getUser().getFullName(), p.getUser().getAvatarUrl());

        if (!p.getEvent().getId().equals(eventId)) {
            return new CheckInResponse(false, "WRONG_EVENT",
                    "Билет от другого события: «" + p.getEvent().getTitle() + "»!",
                    code, null, participant, event.getTitle(), isPaid, event.getPrice());
        }

        if (p.getStatus() != ParticipationStatus.CONFIRMED) {
            return new CheckInResponse(false, "NOT_CONFIRMED",
                    "Заявка участника не подтверждена (статус: " + p.getStatus() + ")",
                    code, null, participant, event.getTitle(), isPaid, event.getPrice());
        }

        if (p.isCheckedIn()) {
            return new CheckInResponse(false, "ALREADY_CHECKED_IN",
                    "Внимание! Билет уже был использован ранее (" + p.getCheckedInAt() + ")!",
                    code, p.getCheckedInAt(), participant, event.getTitle(), isPaid, event.getPrice());
        }

        User manager = userRepository.getReferenceById(auth.id());
        p.setCheckedIn(true);
        p.setCheckedInAt(Instant.now());
        p.setCheckedInBy(manager);
        Participation saved = participationRepository.save(p);

        return new CheckInResponse(true, "SUCCESS",
                "Участник подтверждён и допущен на мероприятие!",
                code, saved.getCheckedInAt(), participant, event.getTitle(), isPaid, event.getPrice());
    }

    /** Заявки и участия текущего пользователя вместе с мероприятиями. */
    @Transactional(readOnly = true)
    public List<ParticipationResponse> mine(AuthUser auth) {
        List<Participation> items = participationRepository.findByUserIdOrderByCreatedAtDesc(auth.id());
        List<EventResponse> events = eventMapper.toList(
                items.stream().map(Participation::getEvent).toList(), auth.id(), false);
        return java.util.stream.IntStream.range(0, items.size())
                .mapToObj(i -> ParticipationResponse.withEvent(items.get(i), events.get(i)))
                .toList();
    }

    private Event lockEvent(Long eventId) {
        return eventRepository.findForUpdate(eventId)
                .orElseThrow(() -> ApiException.notFound("Мероприятие не найдено"));
    }

    private static String generateTicketCode() {
        return "SPT-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
