package ru.sportikus.participation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventAccess;
import ru.sportikus.form.FieldDef;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.security.AuthUser;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/** Выгрузка заявок и участников мероприятия в CSV для организатора. */
@Service
@RequiredArgsConstructor
public class ParticipantCsvExporter {

    private final EventRepository eventRepository;
    private final ParticipationRepository participationRepository;

    /** Экспорт участников мероприятия в формате CSV (Excel-совместимый UTF-8 с BOM). */
    @Transactional(readOnly = true)
    public byte[] export(AuthUser auth, Long eventId) {
        Event event = eventRepository.requireDetailed(eventId);
        if (!EventAccess.isManager(event, auth.id())) {
            throw ApiException.forbidden("Экспорт участников доступен только организатору мероприятия");
        }
        List<Participation> list = participationRepository.findByEventIdOrderByCreatedAtAsc(eventId);

        List<FieldDef> questions = event.getRegistrationFields() != null ? event.getRegistrationFields() : List.of();

        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM для корректного открытия в Excel
        sb.append('\uFEFF');

        // Шапка таблицы
        sb.append("№;ФИО;Email;Статус;Дата заявки;Код билета;Отметка о входе;Время входа;Сообщение участника");
        for (FieldDef q : questions) {
            sb.append(';').append(escapeCsv(q.label()));
        }
        sb.append(";Комментарий организатора\r\n");

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
                .withZone(event.getTimeZone() != null ? ZoneId.of(event.getTimeZone()) : ZoneId.systemDefault());

        int num = 1;
        for (Participation p : list) {
            sb.append(num++).append(';');
            sb.append(escapeCsv(p.getUser() != null ? p.getUser().getFullName() : "")).append(';');
            sb.append(escapeCsv(p.getUser() != null ? p.getUser().getEmail() : "")).append(';');
            sb.append(escapeCsv(statusLabel(p.getStatus()))).append(';');
            sb.append(escapeCsv(p.getCreatedAt() != null ? dtf.format(p.getCreatedAt()) : "")).append(';');
            sb.append(escapeCsv(p.getTicketCode() != null ? p.getTicketCode() : "")).append(';');
            sb.append(p.isCheckedIn() ? "Явился" : "Не явился").append(';');
            sb.append(p.getCheckedInAt() != null ? escapeCsv(dtf.format(p.getCheckedInAt())) : "").append(';');
            sb.append(escapeCsv(p.getMessage() != null ? p.getMessage() : ""));

            Map<String, Object> answers = p.getAnswers() != null ? p.getAnswers() : Map.of();
            for (FieldDef q : questions) {
                Object val = answers.get(q.key());
                sb.append(';').append(escapeCsv(formatAnswer(val)));
            }
            sb.append(';').append(escapeCsv(p.getDecisionComment() != null ? p.getDecisionComment() : ""));
            sb.append("\r\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String statusLabel(ParticipationStatus s) {
        if (s == null) return "";
        return switch (s) {
            case CONFIRMED -> "Подтверждён";
            case PENDING -> "Ожидает решения";
            case WAITLISTED -> "В очереди";
            case REJECTED -> "Отклонён";
            case CANCELLED -> "Отменён";
        };
    }

    private static String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(";") || val.contains("\"") || val.contains("\n") || val.contains("\r")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }

    private static String formatAnswer(Object val) {
        if (val == null) return "";
        if (val instanceof Boolean b) return b ? "Да" : "Нет";
        if (val instanceof List<?> l) {
            return String.join(", ", l.stream().map(Object::toString).toList());
        }
        return val.toString();
    }

}
