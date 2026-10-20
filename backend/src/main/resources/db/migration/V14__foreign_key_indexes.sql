-- V14__foreign_key_indexes.sql
-- Индексы под частые выборки и внешние ключи без индекса.
-- Без них PostgreSQL сканирует таблицу целиком при поиске по колонке и при каскадном
-- удалении / ON DELETE SET NULL родительской строки.

-- Организация владельца: ищется при каждом входе и в каталоге (EventMapper, AuthService)
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations (owner_user_id);

-- Комментарии пользователя: каскад при удалении аккаунта
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments (user_id);

-- Уведомления о мероприятии: каскад при удалении мероприятия
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications (event_id) WHERE event_id IS NOT NULL;
-- «Кого я уже звал на это мероприятие» (NotificationRepository.findRecipientIds)
CREATE INDEX IF NOT EXISTS idx_notifications_sender_event
    ON notifications (sender_user_id, event_id, type) WHERE sender_user_id IS NOT NULL;

-- Ссылки на пользователя, которые обнуляются при удалении аккаунта; почти всегда NULL — частичные индексы
CREATE INDEX IF NOT EXISTS idx_sports_created_by ON sports (created_by_user_id) WHERE created_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participations_decided_by ON participations (decided_by) WHERE decided_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participations_checked_in_by ON participations (checked_in_by) WHERE checked_in_by IS NOT NULL;

-- Дубликаты: ticket_code уже UNIQUE (своё индекс-ограничение), а event_id покрыт
-- uq_event_user (event_id, user_id) и idx_participations_event_status (event_id, status)
DROP INDEX IF EXISTS idx_participations_ticket;
DROP INDEX IF EXISTS idx_participations_event;
