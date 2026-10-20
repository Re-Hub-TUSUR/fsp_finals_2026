package ru.sportikus.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.notification.repository.NotificationRepository;

import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class EventReminderService {

    private static final Duration REMINDER_WINDOW = Duration.ofHours(24);

    private final NotificationRepository notifications;

    @Transactional
    public int sendDueReminders(Instant now) {
        return notifications.insertDueEventReminders(now, now.plus(REMINDER_WINDOW));
    }
}
