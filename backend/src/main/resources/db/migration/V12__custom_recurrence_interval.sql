ALTER TABLE events
    ADD COLUMN IF NOT EXISTS recurrence_interval_days INTEGER;

UPDATE events
SET recurrence_interval_days = 7
WHERE recurrence_rule = 'WEEKLY'
  AND recurrence_interval_days IS NULL;

ALTER TABLE events
    ADD CONSTRAINT chk_events_recurrence_interval_days
    CHECK (recurrence_interval_days IS NULL OR recurrence_interval_days BETWEEN 1 AND 365);
