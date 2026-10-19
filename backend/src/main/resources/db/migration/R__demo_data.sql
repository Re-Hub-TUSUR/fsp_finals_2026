-- R__demo_data.sql
-- Идемпотентные демо-данные (Красноярск). Пароль всех демо-аккаунтов: password123

-- 1. Пользователи
INSERT INTO users (id, email, password_hash, full_name, role, avatar_url)
VALUES
(1, 'user@sport.ru',    '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Иван Иванов',              'ROLE_USER',      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'),
(2, 'olga@sport.ru',    '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Ольга Новичкова',         'ROLE_USER',      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120'),
(3, 'pro@sport.ru',     '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Алексей Профи',           'ROLE_USER',      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120'),
(4, 'enisey@sport.ru',  '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Представитель СК Енисей', 'ROLE_ORGANIZER', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'),
(5, 'ladya@sport.ru',   '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Гроссмейстер Ладьи',      'ROLE_ORGANIZER', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'),
(6, 'admin@sport.ru',   '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Главный Администратор',   'ROLE_ADMIN',     'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 6) FROM users));

-- 2. Организации
INSERT INTO organizations (id, name, description, owner_user_id, status, reject_reason, logo_url)
VALUES
(1, 'Спортивный клуб Енисей', 'Официальный спортивный клуб города Красноярска. Бег, лыжи, волейбол и кроссфит.', 4, 'APPROVED', NULL, 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=120'),
(2, 'Шахматный клуб Ладья', 'Городской клуб любителей шахмат и интеллектуальных видов спорта на о. Татышев.', 5, 'PENDING', NULL, 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=120'),
(3, 'Подпольный боксерский клуб', 'Спарринги в подвале без тренера и экипировки.', 3, 'REJECTED', 'Не указана площадка и отсутствует лицензия безопасности.', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=120')
ON CONFLICT (id) DO NOTHING;

SELECT setval('organizations_id_seq', (SELECT GREATEST(MAX(id), 3) FROM organizations));

-- 3. Пользовательский вид спорта (базовые виды лежат в V2)
INSERT INTO sports (name, slug, is_custom, created_by_user_id)
VALUES ('Воркаут', 'vorkaut', TRUE, 1)
ON CONFLICT DO NOTHING;

-- 4. Мероприятия
INSERT INTO events (id, title, description, sport_id, template_id, organizer_user_id, organizer_org_id,
                    start_time, end_time, lat, lng, address, capacity, join_mode, skill_level,
                    required_equipment, price, registration_deadline, min_age, max_age,
                    fields, details, custom_fields, registration_fields, org_details,
                    status, unpublish_reason)
VALUES
-- Свободный вход, организация
(1, 'Утренний забег на о. Татышев',
 'Лёгкий темповый бег по живописным дорожкам острова. Разминка и чай после финиша.',
 (SELECT id FROM sports WHERE slug = 'beg'), (SELECT id FROM event_templates WHERE code = 'race'), NULL, 1,
 NOW() + INTERVAL '2 hours', NOW() + INTERVAL '3 hours 30 minutes',
 56.0235, 92.9351, 'Красноярск, остров Татышев, павильон дирекции', 20, 'OPEN', 'ANY',
 'Кроссовки для бега, вода', NULL, NULL, 14, NULL,
 (SELECT fields FROM event_templates WHERE code = 'race'),
 '{"distanceKm": 5, "routeType": "Круг", "chipTiming": false, "aidStations": true}'::jsonb,
 '[{"label": "Раздевалка", "value": "В павильоне, есть шкафчики"}]'::jsonb,
 (SELECT registration_fields FROM event_templates WHERE code = 'race'),
 '{"contactName": "Мария Соколова", "contactPhone": "+7 391 200-10-10", "contactEmail": "run@enisey-club.ru",
   "venueName": "Павильон дирекции острова Татышев",
   "requiredDocuments": ["Паспорт или иной документ, удостоверяющий личность"],
   "medicalCertificateRequired": false, "insuranceRequired": false,
   "prizes": "Памятные медали всем финишировавшим",
   "program": [{"time": "Старт − 30 мин", "title": "Сбор и разминка"}, {"time": "Старт", "title": "Забег"}, {"time": "Финиш + 15 мин", "title": "Чай и награждение"}],
   "facilities": ["Раздевалки", "Питьевая вода", "Медик на старте"],
   "cancellationPolicy": "При неблагоприятной погоде старт переносится, участников предупредим."}'::jsonb,
 'PUBLISHED', NULL),
-- Участие по заявке, пользователь
(2, 'Дворовый футбол 5x5',
 'Собираем 2 команды для дружеского матча. Нужен вратарь и пара полевых игроков.',
 (SELECT id FROM sports WHERE slug = 'futbol'), (SELECT id FROM event_templates WHERE code = 'match'), 1, NULL,
 NOW() + INTERVAL '4 hours', NOW() + INTERVAL '6 hours',
 56.0125, 92.8680, 'Красноярск, ул. Ленина, д. 118 (коробка во дворе)', 10, 'APPROVAL', 'AMATEUR',
 'Кроссовки с грунтовой подошвой, щитки по желанию', NULL, NULL, NULL, NULL,
 (SELECT fields FROM event_templates WHERE code = 'match'),
 '{"playFormat": "5x5", "teamsCount": 2, "surface": "Асфальт", "ballProvided": true}'::jsonb,
 '[]'::jsonb,
 (SELECT registration_fields FROM event_templates WHERE code = 'match'),
 NULL, 'PUBLISHED', NULL),
(3, 'Товарищеский турнир по настольному теннису',
 'Играем на вылет до двух побед. Запись по предварительной заявке, уровень от любителя.',
 (SELECT id FROM sports WHERE slug = 'nastolnyj-tennis'), (SELECT id FROM event_templates WHERE code = 'tournament'), 3, NULL,
 NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 3 hours',
 56.0410, 92.9150, 'Красноярск, о. Отдыха, Дворец спорта им. Ивана Ярыгина', 8, 'APPROVAL', 'AMATEUR',
 'Своя ракетка (пара мячей есть)', 200, NOW() + INTERVAL '20 hours', 16, NULL,
 (SELECT fields FROM event_templates WHERE code = 'tournament'),
 '{"system": "На вылет (олимпийская)", "teamSize": 1, "matchDuration": 20, "prizes": "Кубок победителю"}'::jsonb,
 '[{"label": "Взнос", "value": "200 ₽ на аренду зала, оплата на месте"}]'::jsonb,
 (SELECT registration_fields FROM event_templates WHERE code = 'tournament'),
 NULL, 'PUBLISHED', NULL),
(4, 'Воркаут: тренировка и разбор базы',
 'Учимся правильным подтягиваниям, выходам силой и базовой статике. Приглашаются новички!',
 (SELECT id FROM sports WHERE slug = 'vorkaut'), (SELECT id FROM event_templates WHERE code = 'training'), 1, NULL,
 NOW() + INTERVAL '1 day 5 hours', NOW() + INTERVAL '1 day 7 hours',
 56.0090, 92.8720, 'Красноярск, Центральная набережная Енисея, площадка воркаута', 15, 'OPEN', 'NOVICE',
 'Перчатки, бутылка воды', NULL, NULL, NULL, NULL,
 (SELECT fields FROM event_templates WHERE code = 'training'),
 '{"trainer": "Иван Иванов", "format": "Групповое", "intensity": "Средняя"}'::jsonb,
 '[]'::jsonb,
 (SELECT registration_fields FROM event_templates WHERE code = 'training'),
 NULL, 'PUBLISHED', NULL),
-- Снято с публикации (сценарий 6)
(5, 'Сомнительный спарринг в заброшенном цехе',
 'Жёсткие бои без перчаток.',
 (SELECT id FROM sports WHERE slug = 'drugoe'), NULL, 3, NULL,
 NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours',
 55.9900, 92.9500, 'Красноярск, промзона 4', 4, 'OPEN', 'PRO',
 NULL, NULL, NULL, NULL, NULL,
 '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
 NULL, 'UNPUBLISHED', 'Недопустимое место сбора и нарушение правил безопасности платформы.'),
-- Турнир от организации со всеми деталями
(6, 'Открытый турнир по волейболу «Кубок Енисея»',
 'Командный турнир для любителей. Играем два дня по системе «группы + плей-офф». Нужна команда из 6 игроков.',
 (SELECT id FROM sports WHERE slug = 'volejbol'), (SELECT id FROM event_templates WHERE code = 'tournament'), NULL, 1,
 NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 8 hours',
 56.0302, 92.9043, 'Красноярск, ул. Спортивная, 2, спорткомплекс «Енисей»', 12, 'APPROVAL', 'AMATEUR',
 'Сменная спортивная обувь для зала, форма с номерами', 3000, NOW() + INTERVAL '4 days', 16, NULL,
 (SELECT fields FROM event_templates WHERE code = 'tournament'),
 '{"system": "Группы + плей-офф", "teamSize": 6, "matchDuration": 40, "prizes": "Кубки и медали трём призёрам, призовой фонд 30 000 ₽", "rules": "Играем по правилам FIVB с упрощениями для любителей. Полный регламент — по ссылке."}'::jsonb,
 '[{"label": "Взнос", "value": "3000 ₽ с команды"}]'::jsonb,
 (SELECT registration_fields FROM event_templates WHERE code = 'tournament'),
 '{"contactName": "Мария Соколова", "contactPhone": "+7 391 200-10-10", "contactEmail": "volley@enisey-club.ru",
   "website": "https://example.com/enisey-cup", "venueName": "Спорткомплекс «Енисей», большой зал",
   "requiredDocuments": ["Паспорт капитана", "Список команды"],
   "medicalCertificateRequired": true, "insuranceRequired": true,
   "prizes": "Кубки и медали призёрам, призовой фонд 30 000 ₽",
   "program": [{"time": "09:00", "title": "Регистрация и жеребьёвка"}, {"time": "10:00", "title": "Групповой этап"}, {"time": "15:00", "title": "Плей-офф"}, {"time": "17:30", "title": "Награждение"}],
   "facilities": ["Раздевалки и душ", "Парковка", "Буфет", "Медпункт"],
   "cancellationPolicy": "Взнос возвращается полностью при отказе не позднее чем за 3 дня до турнира.",
   "sponsors": "Магазин «Спортмастер», кафе «Подача»"}'::jsonb,
 'PUBLISHED', NULL),
(7, 'Выходные на Столбах: маршрут для начинающих',
 'Неспешный подъём к Первому столбу, перекус на привале и спуск по канатной дороге.',
 (SELECT id FROM sports WHERE slug = 'turizm'), (SELECT id FROM event_templates WHERE code = 'outdoor'), 2, NULL,
 NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 6 hours',
 55.9167, 92.7167, 'Красноярск, национальный парк «Красноярские Столбы», кордон Дача Рощина', 12, 'APPROVAL', 'NOVICE',
 'Треккинговая обувь, дождевик, вода, перекус', NULL, NOW() + INTERVAL '2 days', 12, NULL,
 (SELECT fields FROM event_templates WHERE code = 'outdoor'),
 '{"route": "Дача Рощина → Первый столб → смотровая площадка → канатная дорога", "distanceKm": 9, "difficulty": "Лёгкая", "gear": "Термос, перчатки, лёгкий рюкзак"}'::jsonb,
 '[{"label": "Сбор", "value": "У входа в парк, за 15 минут до старта"}]'::jsonb,
 (SELECT registration_fields FROM event_templates WHERE code = 'outdoor'),
 NULL, 'PUBLISHED', NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('events_id_seq', (SELECT GREATEST(MAX(id), 7) FROM events));

-- 5. Участие
INSERT INTO participations (event_id, user_id, status, message, answers, decision_comment, decided_at, decided_by)
VALUES
(1, 2, 'CONFIRMED', NULL, '{"emergencyContact": "Анна, +7 900 111-22-33", "tshirt": "S"}'::jsonb, NULL, NOW(), NULL),
(2, 2, 'CONFIRMED', 'Играю в поле, могу приехать на машине.', '{}'::jsonb, 'Ждём!', NOW(), 1),
(2, 3, 'PENDING', 'Могу встать на ворота.', '{"position": "Вратарь"}'::jsonb, NULL, NULL, NULL),
(3, 1, 'PENDING', NULL, '{"teamName": "Иван Иванов"}'::jsonb, NULL, NULL, NULL),
(6, 3, 'CONFIRMED', 'Капитан команды «Сибирские медведи».', '{"teamName": "Сибирские медведи", "rating": 1650}'::jsonb, NULL, NOW(), 4),
(6, 2, 'PENDING', 'Команда «Новички», играем впервые.', '{"teamName": "Новички"}'::jsonb, NULL, NULL, NULL),
(7, 1, 'PENDING', NULL, '{"experience": "Был(а) несколько раз", "emergencyContact": "Мария, +7 900 555-44-33"}'::jsonb, NULL, NULL, NULL)
ON CONFLICT (event_id, user_id) DO NOTHING;

-- 6. Комментарии
INSERT INTO comments (event_id, user_id, text, is_organizer, is_hidden)
SELECT v.event_id, v.user_id, v.text, v.is_organizer, FALSE
FROM (VALUES
    (1, 2, 'Подскажите, будет ли где оставить рюкзак на время пробежки?', FALSE),
    (1, 4, 'Да, Ольга! В павильоне дирекции будет закрываемый шкафчик для участников.', TRUE),
    (2, 3, 'Мяч нормальный есть или свой захватить?', FALSE),
    (2, 1, 'Мяч пятёрка Nike есть, но второй запасной лишним не будет!', TRUE)
) AS v(event_id, user_id, text, is_organizer)
WHERE NOT EXISTS (
    SELECT 1 FROM comments c WHERE c.event_id = v.event_id AND c.user_id = v.user_id AND c.text = v.text
);
