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

-- Демо-уведомления для реалистичного живого показа жюри
INSERT INTO notifications (user_id, type, title, message, link_url, sender_user_id, event_id, is_read, created_at)
VALUES
(2, 'PARTICIPATION_CONFIRMED', 'Заявка одобрена!',
 'Организатор СК Енисей подтвердил ваше участие в «Утренний забег на о. Татышев». Ваш электронный QR-билет готов!',
 '/events/1', 4, 1, FALSE, NOW() - INTERVAL '12 minutes'),

(2, 'EVENT_INVITE', 'Иван Иванов приглашает вас',
 'Иван Иванов приглашает вас на мероприятие «Дворовый футбол 5x5». «Привет, Оля! Собираем команду, присоединяйся!»',
 '/events/2', 1, 2, FALSE, NOW() - INTERVAL '45 minutes'),

(1, 'FRIEND_ACCEPTED', 'Заявка в друзья принята',
 'Алексей Профи принял вашу заявку в друзья. Теперь вы можете приглашать друг друга на совместные тренировки.',
 '/profiles/users/3', 3, NULL, FALSE, NOW() - INTERVAL '1 hour 20 minutes'),

(3, 'EVENT_INVITE', 'Иван Иванов приглашает вас',
 'Иван Иванов приглашает вас на мероприятие «Дворовый футбол 5x5».',
 '/events/2', 1, 2, TRUE, NOW() - INTERVAL '3 hours');
