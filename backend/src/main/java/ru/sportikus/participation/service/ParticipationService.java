package ru.sportikus.participation.service;

import lombok.RequiredArgsConstructor;
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
import ru.sportikus.participation.dto.DecisionRequest;
import ru.sportikus.participation.dto.JoinRequest;
import ru.sportikus.participation.dto.ParticipationResponse;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;
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
 *  PENDING | CONFIRMED ─ участник ─▶ CANCELLED           CANCELLED ─ участник (повторно) ─▶ PENDING | CONFIRMED
 * </pre>
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

    @Transactional
    public ParticipationResponse join(AuthUser auth, Long eventId, JoinRequest req) {
        Event event = lockEvent(eventId);
        User user = userRepository.findById(auth.id())
                .orElseThrow(() -> ApiException.unauthorized("Пользователь не найден, войдите заново"));
        Instant now = Instant.now();

        if (auth.isAdmin()) {
            throw ApiException.forbidden("Администратор не участвует в мероприятиях");
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
        if (existing != null) {
            switch (existing.getStatus()) {
                case CONFIRMED -> throw ApiException.conflict("Вы уже участвуете в этом мероприятии");
                case PENDING -> throw ApiException.conflict("Ваша заявка уже отправлена и ждёт решения организатора");
                case REJECTED -> throw ApiException.conflict("Организатор отклонил вашу заявку");
                case CANCELLED -> { /* можно записаться заново */ }
            }
        }

        if (event.requiresAcknowledgement() && !Boolean.TRUE.equals(req.acceptedRequirements())) {
            throw ApiException.badRequest("Подтвердите, что ознакомились с требованиями к участникам");
        }
        Map<String, Object> answers = fieldValidator.validateValues(
                event.getRegistrationFields(), req.answers(), "Анкета участника");

        long confirmed = participationRepository.countByEventIdAndStatus(eventId, ParticipationStatus.CONFIRMED);
        if (confirmed >= event.getCapacity()) {
            throw ApiException.conflict("Все места заняты");
        }

        boolean instant = event.getJoinMode() == JoinMode.OPEN;
        Participation p = existing != null ? existing : Participation.builder().event(event).user(user).build();
        p.setStatus(instant ? ParticipationStatus.CONFIRMED : ParticipationStatus.PENDING);
        p.setMessage(blankToNull(req.message()));
        p.setAnswers(new LinkedHashMap<>(answers));
        p.setDecisionComment(null);
        p.setDecidedBy(null);
        p.setDecidedAt(instant ? now : null);
        return ParticipationResponse.withUser(participationRepository.save(p));
    }

    @Transactional
    public ParticipationResponse cancel(AuthUser auth, Long eventId) {
        Event event = lockEvent(eventId);
        Participation p = participationRepository.findByEventIdAndUserId(eventId, auth.id())
                .orElseThrow(() -> ApiException.notFound("Вы не записаны на это мероприятие"));
        if (p.getStatus() != ParticipationStatus.PENDING && p.getStatus() != ParticipationStatus.CONFIRMED) {
            throw ApiException.conflict("Запись уже неактивна");
        }
        if (!Instant.now().isBefore(event.getEndTime())) {
            throw ApiException.conflict("Мероприятие уже завершилось");
        }
        p.setStatus(ParticipationStatus.CANCELLED);
        p.setDecidedAt(null);
        p.setDecidedBy(null);
        return ParticipationResponse.withUser(participationRepository.save(p));
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
        p.setDecisionComment(blankToNull(req.comment()));
        p.setDecidedAt(Instant.now());
        p.setDecidedBy(manager);
        return ParticipationResponse.withUser(participationRepository.save(p));
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

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
