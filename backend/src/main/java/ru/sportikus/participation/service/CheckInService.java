package ru.sportikus.participation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventAccess;
import ru.sportikus.participation.dto.CheckInResponse;
import ru.sportikus.participation.dto.ParticipationResponse;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;

/** Контроль входа: организатор сканирует QR-билет участника на месте проведения. */
@Service
@RequiredArgsConstructor
public class CheckInService {

    private final EventRepository eventRepository;
    private final ParticipationRepository participationRepository;
    private final UserRepository userRepository;

    /** Контроль входа на мероприятие организатором по коду билета (из QR-кода). */
    @Transactional
    public CheckInResponse checkIn(AuthUser auth, Long eventId, String rawTicketCode) {
        Event event = eventRepository.requireDetailed(eventId);
        if (!EventAccess.isManager(event, auth.id()) && !auth.isAdmin()) {
            throw ApiException.forbidden("Отмечать билеты может только организатор мероприятия");
        }

        boolean isPaid = event.getPrice() != null && event.getPrice().compareTo(BigDecimal.ZERO) > 0;

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

}
