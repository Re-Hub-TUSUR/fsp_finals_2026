ALTER TABLE events
    ADD COLUMN IF NOT EXISTS recurrence_rule VARCHAR(20) NOT NULL DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS recurrence_series_id UUID,
    ADD COLUMN IF NOT EXISTS next_occurrence_id BIGINT REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_recurrence_series
    ON events (recurrence_series_id)
    WHERE recurrence_series_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_next_occurrence
    ON events (next_occurrence_id)
    WHERE next_occurrence_id IS NOT NULL;
