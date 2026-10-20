package ru.sportikus.notification.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ru.sportikus.notification.service.EventReminderService;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class EventReminderJobs {

    private static final Logger log = LoggerFactory.getLogger(EventReminderJobs.class);

    private final EventReminderService reminders;

    @Scheduled(
            fixedDelayString = "${notifications.reminders.fixed-delay:PT5M}",
            initialDelayString = "${notifications.reminders.initial-delay:PT20S}")
    public void sendEventReminders() {
        try {
            int created = reminders.sendDueReminders(Instant.now());
            if (created > 0) {
                log.info("Created {} event reminders", created);
            }
        } catch (RuntimeException e) {
            log.warn("Could not create event reminders", e);
        }
    }
}
