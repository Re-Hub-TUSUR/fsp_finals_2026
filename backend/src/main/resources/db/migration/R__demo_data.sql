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


-- =====================================================================
-- Рекомендации: пользователи в разных городах, их интересы и активность
-- =====================================================================

-- 7. Ещё пользователи: Мария (Москва) — в демо-панели, остальные дают «фон» для сигнала «похожие люди»
INSERT INTO users (id, email, password_hash, full_name, role, avatar_url)
VALUES
(7,  'masha@sport.ru',   '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Мария Москвина',     'ROLE_USER', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120'),
(8,  'dima@sport.ru',    '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Дмитрий Бегунов',    'ROLE_USER', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120'),
(9,  'anna@sport.ru',    '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Анна Гибкая',        'ROLE_USER', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'),
(10, 'sergey@sport.ru',  '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Сергей Мячов',       'ROLE_USER', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120'),
(11, 'katya@sport.ru',   '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Екатерина Лёгкая',   'ROLE_USER', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120'),
(12, 'pavel@sport.ru',   '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Павел Нападающий',   'ROLE_USER', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120'),
(13, 'natasha@sport.ru', '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Наталья Лыжная',     'ROLE_USER', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120'),
(14, 'artem@sport.ru',   '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Артём Стратег',      'ROLE_USER', 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120'),
(15, 'yulia@sport.ru',   '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Юлия Походная',      'ROLE_USER', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120'),
(16, 'probeg@sport.ru',  '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Представитель клуба «Пробег»', 'ROLE_ORGANIZER', 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=120'),
(17, 'sibir@sport.ru',   '$2a$10$ooE1yf6dhBQSt8V3zCbn6uNQM8lbtykuStc3af.kmhUOiUeK8T4hW', 'Представитель ФОК «Сибирь»',   'ROLE_ORGANIZER', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 17) FROM users));

INSERT INTO organizations (id, name, description, owner_user_id, status, reject_reason, logo_url)
VALUES
(4, 'Беговой клуб «Пробег»', 'Московский клуб любителей бега: забеги, интервальные тренировки, подготовка к марафонам.', 16, 'APPROVED', NULL, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=120'),
(5, 'ФОК «Сибирь»', 'Физкультурно-оздоровительный комплекс в центре Новосибирска.', 17, 'APPROVED', NULL, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=120')
ON CONFLICT (id) DO NOTHING;

SELECT setval('organizations_id_seq', (SELECT GREATEST(MAX(id), 5) FROM organizations));

INSERT INTO sports (name, slug, is_custom, created_by_user_id)
VALUES ('Скандинавская ходьба', 'skandinavskaya-hodba', TRUE, 15)
ON CONFLICT DO NOTHING;

-- 8. Мероприятия в разных городах. Время задано в местном часовом поясе ближайшего города:
--    day — через сколько дней, at — местное время начала, dur — длительность в минутах.
INSERT INTO events (id, title, description, sport_id, template_id, organizer_user_id, organizer_org_id,
                    start_time, end_time, lat, lng, address, capacity, join_mode, skill_level, price,
                    fields, registration_fields, city_id, time_zone, status)
SELECT v.id, v.title, v.descr, s.id, t.id, v.org_user, v.org_id,
       (date_trunc('day', now() AT TIME ZONE c.time_zone) + make_interval(days => v.day) + v.at::interval) AT TIME ZONE c.time_zone,
       (date_trunc('day', now() AT TIME ZONE c.time_zone) + make_interval(days => v.day) + v.at::interval
            + make_interval(mins => v.dur)) AT TIME ZONE c.time_zone,
       v.lat, v.lng, v.address, v.cap, v.mode, v.skill, v.price,
       COALESCE(t.fields, '[]'::jsonb), COALESCE(t.registration_fields, '[]'::jsonb), c.id, c.time_zone, 'PUBLISHED'
FROM (VALUES
    -- Красноярск
    (8,  'Велопрогулка по набережной Енисея', 'Спокойный темп, 25 км по набережным и острову Татышев.', 'velosport', 'outdoor', 8::bigint, NULL::bigint, 1, '10:00', 150, 56.0105, 92.8650, 'Красноярск, набережная Енисея, у Коммунального моста', 15, 'OPEN', 'ANY', NULL::numeric),
    (9,  'Утренняя йога в Центральном парке', 'Мягкая практика для начинающих, коврики есть.', 'joga', 'training', 9, NULL, 2, '08:00', 60, 56.0108, 92.8790, 'Красноярск, Центральный парк, поляна у фонтана', 20, 'OPEN', 'NOVICE', NULL),
    (10, 'Баскетбол 3x3 на Свободном', 'Собираем команды 3x3, играем до 21 очка.', 'basketbol', 'match', 10, NULL, 1, '19:00', 120, 56.0180, 92.8270, 'Красноярск, пр. Свободный, площадка СФУ', 9, 'APPROVAL', 'AMATEUR', NULL),
    (11, 'Лыжероллеры: техника конькового хода', 'Готовимся к лыжному сезону, разбираем технику.', 'lyzhi', 'training', 8, NULL, 3, '07:30', 90, 56.0560, 92.7480, 'Красноярск, Академгородок, лыжероллерная трасса', 10, 'APPROVAL', 'AMATEUR', NULL),
    (12, 'Турнир «Осенняя ракетка»', 'Личный турнир по настольному теннису, групповой этап и плей-офф.', 'nastolnyj-tennis', 'tournament', NULL, 1, 4, '11:00', 300, 56.0302, 92.9043, 'Красноярск, ул. Спортивная, 2, спорткомплекс «Енисей»', 16, 'APPROVAL', 'PRO', 300),
    (13, 'Вечерний волейбол в зале', 'Смешанные команды, играем до трёх партий.', 'volejbol', 'match', 10, NULL, 2, '20:00', 120, 56.0450, 92.9300, 'Красноярск, ул. Высотная, спортзал школы № 145', 14, 'APPROVAL', 'AMATEUR', 250),
    (14, 'Поход на Торгашинский хребет', 'Подъём по лестнице и прогулка по хребту, виды на весь город.', 'turizm', 'outdoor', 15, NULL, 5, '09:00', 360, 55.9700, 92.9200, 'Красноярск, ул. Свердловская, начало тропы на Торгашинский хребет', 15, 'APPROVAL', 'NOVICE', NULL),
    (15, 'Бачата для начинающих', 'Базовые шаги и первые связки, пара не нужна.', 'tantsy', 'training', 9, NULL, 1, '19:30', 90, 56.0090, 92.8520, 'Красноярск, ул. Карла Маркса, 49, танцевальная студия', 16, 'OPEN', 'NOVICE', 400),
    (16, 'Пробежка 10 км через Октябрьский мост', 'Темп 5:30–6:00 на километр, после — кофе.', 'beg', 'training', 8, NULL, 1, '07:00', 75, 56.0050, 92.9400, 'Красноярск, Октябрьский мост, сбор у ТРЦ «Планета»', 20, 'OPEN', 'AMATEUR', NULL),
    (17, 'Шахматный блиц в библиотеке', 'Швейцарка в 7 туров, контроль 3+2.', 'shahmaty', 'intellect', 3, NULL, 3, '18:00', 120, 56.0100, 92.8700, 'Красноярск, ул. Ленина, 66, краевая библиотека', 12, 'OPEN', 'ANY', NULL),
    (18, 'Плавание: техника кроля', 'Тренировка с тренером по дорожкам, 45 минут в воде.', 'plavanie', 'training', NULL, 1, 2, '07:00', 60, 56.0320, 92.9070, 'Красноярск, ул. Спортивная, 2, бассейн «Енисей»', 10, 'APPROVAL', 'AMATEUR', 500),
    (19, 'Футбол 8x8 на искусственном поле', 'Два тайма по 40 минут, манишки есть.', 'futbol', 'match', 10, NULL, 3, '19:00', 90, 56.0270, 92.9010, 'Красноярск, о. Отдыха, стадион «Енисей», малое поле', 16, 'APPROVAL', 'AMATEUR', 300),
    (20, 'Скандинавская ходьба для новичков', 'Палки выдадим, научим технике.', 'skandinavskaya-hodba', 'training', 15, NULL, 2, '10:00', 90, 56.0230, 92.9350, 'Красноярск, о. Татышев, вход с Октябрьского моста', 25, 'OPEN', 'NOVICE', NULL),
    -- Москва
    (21, 'Субботний забег в Парке Горького', '5 и 10 км, хронометраж, медали финишерам.', 'beg', 'race', NULL, 4, 2, '09:00', 120, 55.7298, 37.6010, 'Москва, Парк Горького, главный вход', 200, 'OPEN', 'ANY', NULL),
    (22, 'Велозаезд по Воробьёвым горам', '40 км с подъёмами, средний темп 25 км/ч.', 'velosport', 'outdoor', 11, NULL, 1, '08:00', 180, 55.7100, 37.5450, 'Москва, Воробьёвы горы, смотровая площадка', 20, 'OPEN', 'AMATEUR', NULL),
    (23, 'Йога на рассвете в Зарядье', 'Практика на свежем воздухе с видом на Кремль.', 'joga', 'training', 11, NULL, 3, '07:00', 60, 55.7514, 37.6290, 'Москва, парк Зарядье', 30, 'OPEN', 'NOVICE', 300),
    (24, 'Футбол 6x6 в Лужниках', 'Играем на малом поле, нужен вратарь.', 'futbol', 'match', 12, NULL, 1, '20:00', 120, 55.7158, 37.5537, 'Москва, Лужники, малое поле', 12, 'APPROVAL', 'AMATEUR', 500),
    (25, 'Плавательная тренировка в «Лужниках»', 'Работа над выносливостью, 2 км.', 'plavanie', 'training', 11, NULL, 2, '07:30', 60, 55.7160, 37.5560, 'Москва, Дворец водных видов спорта «Лужники»', 12, 'APPROVAL', 'AMATEUR', 700),
    (26, 'Пляжный волейбол в Серебряном Бору', 'Играем 2x2 и 4x4, мяч и сетка есть.', 'volejbol', 'match', 12, NULL, 4, '11:00', 180, 55.7800, 37.4300, 'Москва, Серебряный Бор, пляж № 2', 12, 'OPEN', 'ANY', NULL),
    (27, 'Интервальная тренировка к полумарафону', 'Отрезки по 1 км с тренером клуба.', 'beg', 'training', NULL, 4, 1, '19:30', 90, 55.7870, 37.6780, 'Москва, парк Сокольники, у центрального входа', 25, 'APPROVAL', 'AMATEUR', NULL),
    -- Новосибирск
    (28, 'Лыжероллеры в Заельцовском бору', 'Классика и конёк, разминка с тренером.', 'lyzhi', 'training', 13, NULL, 2, '09:00', 120, 55.0890, 82.9180, 'Новосибирск, Заельцовский бор, вход у зоопарка', 15, 'OPEN', 'AMATEUR', NULL),
    (29, 'Шахматный турнир «Сибирская ладья»', 'Рапид 15+10, 7 туров по швейцарской системе.', 'shahmaty', 'tournament', NULL, 5, 4, '12:00', 300, 55.0300, 82.9200, 'Новосибирск, Красный проспект, 8, ФОК «Сибирь»', 32, 'APPROVAL', 'ANY', 200),
    (30, 'Вечер настольных стратегий', 'Играем в «Каркассон», «Колонизаторов» и «Кодовые имена».', 'nastolnye-igry', 'intellect', 14, NULL, 1, '19:00', 180, 55.0410, 82.9346, 'Новосибирск, ул. Ленина, 12, антикафе', 12, 'OPEN', 'ANY', 350),
    (31, 'Поход к Бердским скалам', 'Однодневный маршрут 12 км, подходит новичкам.', 'turizm', 'outdoor', 13, NULL, 5, '08:00', 480, 54.6500, 83.3100, 'Новосибирская область, Бердские скалы, сбор у ст. Изумрудный городок', 15, 'APPROVAL', 'NOVICE', NULL),
    (32, 'Забег вдоль Оби', '5 км по Михайловской набережной.', 'beg', 'race', NULL, 5, 3, '09:00', 120, 55.0160, 82.9200, 'Новосибирск, Михайловская набережная', 150, 'OPEN', 'ANY', NULL),
    -- Санкт-Петербург
    (33, 'Пробежка по Елагину острову', 'Круг 5 км вокруг острова, темп разговорный.', 'beg', 'training', 11, NULL, 2, '08:00', 60, 59.9790, 30.2630, 'Санкт-Петербург, Елагин остров, у главного входа', 30, 'OPEN', 'ANY', NULL)
) AS v(id, title, descr, sport, tpl, org_user, org_id, day, at, dur, lat, lng, address, cap, mode, skill, price)
JOIN sports s ON s.slug = v.sport
LEFT JOIN event_templates t ON t.code = v.tpl
CROSS JOIN LATERAL (
    SELECT id, time_zone FROM cities
    ORDER BY geog <-> geography(ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)) LIMIT 1
) c
ON CONFLICT (id) DO NOTHING;

-- Контакты организаций для их мероприятий
UPDATE events SET org_details = '{"contactName": "Игорь Смирнов", "contactPhone": "+7 495 100-20-30", "contactEmail": "run@probeg.example", "facilities": ["Раздевалки", "Питьевая вода"]}'::jsonb
WHERE organizer_org_id = 4 AND org_details IS NULL;
UPDATE events SET org_details = '{"contactName": "Ольга Ветрова", "contactPhone": "+7 383 200-30-40", "facilities": ["Раздевалки", "Буфет"]}'::jsonb
WHERE organizer_org_id = 5 AND org_details IS NULL;
UPDATE events SET org_details = '{"contactName": "Мария Соколова", "contactPhone": "+7 391 200-10-10"}'::jsonb
WHERE organizer_org_id = 1 AND org_details IS NULL;

SELECT setval('events_id_seq', (SELECT GREATEST(MAX(id), 33) FROM events));

-- Город и часовой пояс для событий, созданных без них
UPDATE events e SET city_id = (SELECT c.id FROM cities c ORDER BY c.geog <-> e.geog LIMIT 1)
WHERE e.city_id IS NULL;
UPDATE events e SET time_zone = c.time_zone FROM cities c WHERE c.id = e.city_id AND e.time_zone IS NULL;

-- 9. Интересы и предпочтения (обычно задаются при регистрации)
INSERT INTO user_preferences (user_id, skill_level, home_city_id, max_distance_km, preferred_times, max_price, birth_year)
SELECT v.uid, v.skill, c.id, v.dist, v.times::jsonb, v.price, v.born
FROM (VALUES
    (1,  'AMATEUR', 'Красноярск',  25, '["EVENING", "WEEKEND"]', NULL::numeric, 1995),
    (2,  'NOVICE',  'Красноярск',  20, '["MORNING", "WEEKEND"]', 500,           1999),
    (3,  'PRO',     'Красноярск',  30, '["EVENING"]',            NULL,          1990),
    (7,  'AMATEUR', 'Москва',      25, '["MORNING", "WEEKEND"]', NULL,          1993),
    (8,  'AMATEUR', 'Красноярск',  25, '[]',                     NULL,          1988),
    (9,  'NOVICE',  'Красноярск',  25, '[]',                     NULL,          1997),
    (10, 'AMATEUR', 'Красноярск',  25, '[]',                     NULL,          1992),
    (11, 'AMATEUR', 'Москва',      25, '[]',                     NULL,          1994),
    (12, 'AMATEUR', 'Москва',      25, '[]',                     NULL,          1989),
    (13, 'AMATEUR', 'Новосибирск', 50, '[]',                     NULL,          1991),
    (14, 'ANY',     'Новосибирск', 25, '[]',                     NULL,          1996),
    (15, 'NOVICE',  'Красноярск',  25, '[]',                     NULL,          1998)
) AS v(uid, skill, city, dist, times, price, born)
JOIN cities c ON c.name = v.city
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_interests (user_id, sport_id)
SELECT v.uid, s.id
FROM (VALUES
    (1, 'futbol'), (1, 'vorkaut'), (1, 'beg'),
    (2, 'joga'), (2, 'beg'), (2, 'turizm'),
    (3, 'nastolnyj-tennis'), (3, 'tennis'), (3, 'volejbol'), (3, 'shahmaty'),
    (7, 'beg'), (7, 'velosport'), (7, 'plavanie'),
    (8, 'beg'), (8, 'velosport'), (8, 'lyzhi'),
    (9, 'joga'), (9, 'tantsy'), (9, 'plavanie'),
    (10, 'futbol'), (10, 'basketbol'), (10, 'volejbol'),
    (11, 'beg'), (11, 'joga'), (11, 'velosport'),
    (12, 'futbol'), (12, 'volejbol'),
    (13, 'lyzhi'), (13, 'beg'), (13, 'turizm'),
    (14, 'shahmaty'), (14, 'nastolnye-igry'), (14, 'nastolnyj-tennis'),
    (15, 'turizm'), (15, 'joga'), (15, 'beg'), (15, 'skandinavskaya-hodba')
) AS v(uid, slug)
JOIN sports s ON s.slug = v.slug
ON CONFLICT DO NOTHING;

-- 10. Активность «фоновых» пользователей: популярность событий и совместная встречаемость видов спорта
INSERT INTO participations (event_id, user_id, status, decided_at)
VALUES
(16, 15, 'CONFIRMED', NOW()), (16, 9, 'CONFIRMED', NOW()), (16, 10, 'CONFIRMED', NOW()),
(8, 15, 'CONFIRMED', NOW()), (9, 15, 'CONFIRMED', NOW()), (14, 9, 'PENDING', NULL),
(19, 8, 'CONFIRMED', NOW()), (13, 15, 'PENDING', NULL), (15, 15, 'CONFIRMED', NOW()),
(21, 11, 'CONFIRMED', NOW()), (21, 12, 'CONFIRMED', NOW()), (24, 11, 'CONFIRMED', NOW()),
(23, 12, 'CONFIRMED', NOW()), (29, 14, 'CONFIRMED', NOW()), (29, 13, 'PENDING', NULL),
(30, 13, 'CONFIRMED', NOW()), (32, 14, 'CONFIRMED', NOW())
ON CONFLICT (event_id, user_id) DO NOTHING;

-- 11. Демо-друзья: Иван видит знакомые лица на карточках ближайших мероприятий.
INSERT INTO friendships (requester_id, recipient_id, status, accepted_at)
SELECT v.requester_id, v.recipient_id, 'ACCEPTED', NOW()
FROM (VALUES (1::bigint, 2::bigint), (1::bigint, 3::bigint), (1::bigint, 8::bigint),
             (2::bigint, 9::bigint), (7::bigint, 11::bigint)) AS v(requester_id, recipient_id)
WHERE NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE LEAST(f.requester_id, f.recipient_id) = LEAST(v.requester_id, v.recipient_id)
      AND GREATEST(f.requester_id, f.recipient_id) = GREATEST(v.requester_id, v.recipient_id)
);

INSERT INTO participations (event_id, user_id, status, decided_at)
VALUES (1, 3, 'CONFIRMED', NOW()), (19, 1, 'CONFIRMED', NOW())
ON CONFLICT (event_id, user_id) DO NOTHING;
