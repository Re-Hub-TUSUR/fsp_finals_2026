-- V7__tickets_and_checkin.sql
-- Электронные билеты с уникальными QR-кодами и контроль входа (чек-ин) организатором

ALTER TABLE participations
    ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(64) UNIQUE,
    ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS checked_in_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participations_ticket ON participations(ticket_code);

-- Генерация уникальных кодов билетов для существующих подтверждённых участий
UPDATE participations
SET ticket_code = 'SPT-' || UPPER(SUBSTRING(MD5(id::text || user_id::text || event_id::text || 'sportikus'), 1, 8))
WHERE status = 'CONFIRMED' AND ticket_code IS NULL;
