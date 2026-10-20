-- One reminder per participant and event. The partial index also makes the
-- scheduled INSERT safe when several application instances run concurrently.
CREATE UNIQUE INDEX uq_notifications_event_reminder
    ON notifications (user_id, event_id, type)
    WHERE type = 'EVENT_REMINDER';
