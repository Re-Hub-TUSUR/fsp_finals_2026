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
import ru.sportikus.form.FieldDef;
import ru.sportikus.form.FieldType;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.participation.service.ParticipantCsvExporter;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ParticipantCsvExporterTest {

    private static final long EVENT_ID = 10L;
    private static final AuthUser ORGANIZER = new AuthUser(1L, "user@sport.ru", "ROLE_USER");
    private static final AuthUser PARTICIPANT = new AuthUser(2L, "olga@sport.ru", "ROLE_USER");

    @Mock(answer = Answers.CALLS_REAL_METHODS) EventRepository eventRepository;
    @Mock ParticipationRepository participationRepository;

    ParticipantCsvExporter exporter;
    Event event;

    @BeforeEach
    void setUp() {
        exporter = new ParticipantCsvExporter(eventRepository, participationRepository);
        event = Event.builder().id(EVENT_ID).title("Футбол")
                .organizerUser(User.builder().id(1L).fullName("Иван").build())
                .timeZone("Asia/Krasnoyarsk")
                .build();
        when(eventRepository.findDetailedById(EVENT_ID)).thenReturn(Optional.of(event));
    }

    private static Participation olga() {
        return Participation.builder()
                .id(1L)
                .user(User.builder().id(2L).fullName("Ольга").email("olga@sport.ru").build())
                .status(ParticipationStatus.CONFIRMED)
                .ticketCode("SPT-12345678")
                .checkedIn(true)
                .checkedInAt(Instant.parse("2026-10-20T12:30:00Z"))
                .message("Буду вовремя")
                .decisionComment("Добро пожаловать")
                .createdAt(Instant.parse("2026-10-20T10:00:00Z"))
                .build();
    }

    private String exportAs(AuthUser user) {
        return new String(exporter.export(user, EVENT_ID), StandardCharsets.UTF_8);
    }

    @Test
    void organizerExportsParticipantsWithBomAndLocalTimes() {
        when(participationRepository.findByEventIdOrderByCreatedAtAsc(EVENT_ID)).thenReturn(List.of(olga()));

        String csv = exportAs(ORGANIZER);

        assertThat(csv).startsWith("﻿");
        assertThat(csv).contains("№;ФИО;Email;Статус;Дата заявки;Код билета;Отметка о входе;Время входа;Сообщение участника;Комментарий организатора");
        assertThat(csv).contains("Ольга;olga@sport.ru;Подтверждён");
        // Время — в часовом поясе мероприятия (Красноярск, UTC+7)
        assertThat(csv).contains("20.10.2026 17:00").contains("SPT-12345678;Явился;20.10.2026 19:30");
        assertThat(csv).contains("Буду вовремя").contains("Добро пожаловать");
    }

    @Test
    void answersToRegistrationQuestionsBecomeColumns() {
        event.setRegistrationFields(List.of(
                new FieldDef("size", "Размер; футболки", FieldType.TEXT, false, null, null, null, null),
                new FieldDef("first", "Первый раз?", FieldType.BOOLEAN, false, null, null, null, null)));
        Participation p = olga();
        p.setAnswers(Map.of("size", "M", "first", true));
        when(participationRepository.findByEventIdOrderByCreatedAtAsc(EVENT_ID)).thenReturn(List.of(p));

        String csv = exportAs(ORGANIZER);

        // Заголовок с разделителем экранирован кавычками, булев ответ — «Да»
        assertThat(csv).contains(";\"Размер; футболки\";Первый раз?;Комментарий организатора");
        assertThat(csv).contains("Буду вовремя;M;Да;Добро пожаловать");
    }

    @Test
    void nonOrganizerCannotExport() {
        assertThatThrownBy(() -> exporter.export(PARTICIPANT, EVENT_ID))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("только организатору");
    }
}
