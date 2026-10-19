-- V5__event_moderation.sql
-- Автопроверка новых мероприятий: фильтр запрещённых слов → при сомнении проверка LLM.
--
-- moderation_status:
--   CLEAN    — фильтр ничего не нашёл, мероприятие опубликовано сразу
--   PENDING  — идёт проверка ИИ (мероприятие скрыто, events.status = 'MODERATION')
--   FLAGGED  — ИИ пропустил, но мероприятие было сомнительным: администратору стоит взглянуть
--   REJECTED — ИИ отклонил: мероприятие снято с публикации с причиной
--   REVIEWED — администратор проверил вручную (пометка снята)

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'CLEAN',
    ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
    ADD COLUMN IF NOT EXISTS moderation_hits JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS moderation_model VARCHAR(100),
    ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE events
    ADD CONSTRAINT chk_events_moderation_status
        CHECK (moderation_status IN ('CLEAN', 'PENDING', 'FLAGGED', 'REJECTED', 'REVIEWED'));

-- Очередь внимания администратора и «зависшие» проверки
CREATE INDEX IF NOT EXISTS idx_events_moderation_attention
    ON events (moderation_status, created_at)
    WHERE moderation_status IN ('PENDING', 'FLAGGED', 'REJECTED');
