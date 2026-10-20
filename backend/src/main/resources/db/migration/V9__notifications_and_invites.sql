-- V9__notifications_and_invites.sql
-- Центр уведомлений и приглашения друзей на мероприятия

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(255),
    sender_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_lookup ON notifications (user_id, is_read, created_at DESC);

-- Демо-уведомления перенесены в R__demo_data.sql: здесь пользователей и мероприятий ещё нет,
-- и вставка ломала миграцию чистой базы (нарушение внешнего ключа notifications_user_id_fkey).
