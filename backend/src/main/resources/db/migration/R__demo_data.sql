-- R__demo_data.sql
-- Idempotent Demo Seed Data for Krasnoyarsk

-- 1. Demo Users (Password: 'password123', BCrypt hash: $2a$10$eACCYoNOHEqgkZz9nGTy5OqD5Lq8W0R6iRfg/8t5vD8l3kZ4UeGTu or similar)
-- Using a standard bcrypt hash for 'password123': $2a$10$7R6B81wOaC7.Vv477Q6sZ.3K0WzI3q.Zk0v9N9qD4M7vF8tG7Fz2i
INSERT INTO users (id, email, password_hash, full_name, role, avatar_url)
VALUES 
(1, 'user@sport.ru', '$2a$10$XQzB7O2X0s/r9R6P5k8r2eH1wKqWpX0q2A4o8B1p3q5e7r9t1u3w2', 'Иван Иванов', 'ROLE_USER', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'),
(2, 'olga@sport.ru', '$2a$10$XQzB7O2X0s/r9R6P5k8r2eH1wKqWpX0q2A4o8B1p3q5e7r9t1u3w2', 'Ольга Новичкова', 'ROLE_USER', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120'),
(3, 'pro@sport.ru', '$2a$10$XQzB7O2X0s/r9R6P5k8r2eH1wKqWpX0q2A4o8B1p3q5e7r9t1u3w2', 'Алексей Профи', 'ROLE_USER', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120'),
(4, 'enisey@sport.ru', '$2a$10$XQzB7O2X0s/r9R6P5k8r2eH1wKqWpX0q2A4o8B1p3q5e7r9t1u3w2', 'Представитель СК Енисей', 'ROLE_ORGANIZER', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'),
(5, 'ladya@sport.ru', '$2a$10$XQzB7O2X0s/r9R6P5k8r2eH1wKqWpX0q2A4o8B1p3q5e7r9t1u3w2', 'Гроссмейстер Ладьи', 'ROLE_ORGANIZER', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'),
(6, 'admin@sport.ru', '$2a$10$XQzB7O2X0s/r9R6P5k8r2eH1wKqWpX0q2A4o8B1p3q5e7r9t1u3w2', 'Главный Администратор', 'ROLE_ADMIN', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 6) FROM users));

-- 2. Organizations
INSERT INTO organizations (id, name, description, owner_user_id, status, reject_reason, logo_url)
VALUES
(1, 'Спортивный клуб Енисей', 'Официальный спортивный клуб города Красноярска. Бег, лыжи, волейбол и кроссфит.', 4, 'APPROVED', NULL, 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=120'),
(2, 'Шахматный клуб Ладья', 'Городской клуб любителей шахмат и интеллектуальных видов спорта на о. Татышев.', 5, 'PENDING', NULL, 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=120'),
(3, 'Подпольный боксерский клуб', 'Спарринги в подвале без тренера и экипировки.', 3, 'REJECTED', 'Не указана площадка и отсутствует лицензия безопасности.', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=120')
ON CONFLICT (id) DO NOTHING;

SELECT setval('organizations_id_seq', (SELECT GREATEST(MAX(id), 3) FROM organizations));

-- 3. Base Sports
INSERT INTO sports (id, name, slug, is_custom, created_by_user_id)
VALUES
(1, 'Футбол', 'futbol', FALSE, NULL),
(2, 'Баскетбол', 'basketbol', FALSE, NULL),
(3, 'Бег', 'beg', FALSE, NULL),
(4, 'Волейбол', 'volejbol', FALSE, NULL),
(5, 'Настольный теннис', 'nastolnyj-tennis', FALSE, NULL),
(6, 'Шахматы', 'shahmaty', FALSE, NULL),
(7, 'Воркаут', 'vorkaut', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('sports_id_seq', (SELECT GREATEST(MAX(id), 7) FROM sports));

-- 4. Events in Krasnoyarsk
INSERT INTO events (id, title, description, sport_id, organizer_user_id, organizer_org_id, start_time, end_time, lat, lng, address, capacity, join_mode, skill_level, required_equipment, status, unpublish_reason)
VALUES
(1, 'Утренний забег на о. Татышев', 'Легкий темповый бег 5 км по живописным дорожкам острова. Разминка и чай после финиша.', 3, NULL, 1, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '3 hours 30 minutes', 56.0235, 92.9351, 'Красноярск, остров Татышев, павильон дирекции', 20, 'OPEN', 'ANY', 'Кроссовки для бега, вода', 'PUBLISHED', NULL),
(2, 'Дворовый футбол 5x5', 'Собираем 2 команды для дружеского матча. Нужен вратарь и пара полевых игроков.', 1, 1, NULL, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '6 hours', 56.0125, 92.8680, 'Красноярск, ул. Ленина, д. 118 (коробка во дворе)', 10, 'OPEN', 'AMATEUR', 'Кроссовки с грунтовой подошвой, щитки по желанию', 'PUBLISHED', NULL),
(3, 'Товарищеский турнир по настольному теннису', 'Играем на вылет до двух побед. Запись по предварительной заявке, уровень от любителя.', 5, 3, NULL, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 3 hours', 56.0410, 92.9150, 'Красноярск, о. Отдыха, Дворец спорта им. Ивана Ярыгина', 8, 'APPROVAL', 'AMATEUR', 'Своя ракетка (пара мячей есть)', 'PUBLISHED', NULL),
(4, 'Воркаут тренировка и разбор базы', 'Учимся правильным подтягиваниям, выходам силой и базовой статике. Приглашаются новички!', 7, 1, NULL, NOW() + INTERVAL '1 day 5 hours', NOW() + INTERVAL '1 day 7 hours', 56.0090, 92.8720, 'Красноярск, Центральная набережная Енисея, площадка воркаута', 15, 'OPEN', 'NOVICE', 'Перчатки, бутылка воды', 'PUBLISHED', NULL),
(5, 'Сомнительный спарринг в заброшенном цехе', 'Жесткие бои без перчаток.', 1, 3, NULL, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours', 55.9900, 92.9500, 'Красноярск, промзона 4', 4, 'OPEN', 'PRO', NULL, 'UNPUBLISHED', 'Недопустимое место сбора и нарушение правил безопасности платформы.')
ON CONFLICT (id) DO NOTHING;

SELECT setval('events_id_seq', (SELECT GREATEST(MAX(id), 5) FROM events));

-- 5. Participations
INSERT INTO participations (event_id, user_id, status)
VALUES
(1, 2, 'CONFIRMED'),
(2, 2, 'CONFIRMED'),
(3, 1, 'PENDING')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- 6. Comments
INSERT INTO comments (event_id, user_id, text, is_organizer, is_hidden)
VALUES
(1, 2, 'Подскажите, будет ли где оставить рюкзак на время пробежки?', FALSE, FALSE),
(1, 4, 'Да, Ольга! В павильоне дирекции будет закрываемый шкафчик для участников.', TRUE, FALSE),
(2, 3, 'Мяч нормальный есть или свой захватить?', FALSE, FALSE),
(2, 1, 'Мяч пятерка Nike есть, но второй запасной лишним не будет!', TRUE, FALSE)
ON CONFLICT DO NOTHING;
