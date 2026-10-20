package ru.sportikus.notification;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.sportikus.notification.repository.NotificationRepository;
import ru.sportikus.notification.service.EventReminderService;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventReminderServiceTest {

    @Mock
    NotificationRepository notifications;

    @InjectMocks
    EventReminderService service;

    @Test
    void createsRemindersForTheNextTwentyFourHours() {
        Instant now = Instant.parse("2026-10-20T06:00:00Z");
        Instant deadline = Instant.parse("2026-10-21T06:00:00Z");
        when(notifications.insertDueEventReminders(now, deadline)).thenReturn(2);

        int created = service.sendDueReminders(now);

        assertThat(created).isEqualTo(2);
        verify(notifications).insertDueEventReminders(now, deadline);
    }
}
