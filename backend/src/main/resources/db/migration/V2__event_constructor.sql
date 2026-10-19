-- V2__event_constructor.sql
-- Конструктор мероприятий: шаблоны с настраиваемыми полями, детали для организаций,
-- подтверждение участия организатором.

-- ---------------------------------------------------------------------------
-- Виды активности (справочник). Пользователи могут добавлять свои (is_custom).
-- ---------------------------------------------------------------------------
INSERT INTO sports (name, slug, is_custom) VALUES
    ('Футбол', 'futbol', FALSE),
    ('Баскетбол', 'basketbol', FALSE),
    ('Бег', 'beg', FALSE),
    ('Волейбол', 'volejbol', FALSE),
    ('Настольный теннис', 'nastolnyj-tennis', FALSE),
    ('Шахматы', 'shahmaty', FALSE),
    ('Теннис', 'tennis', FALSE),
    ('Плавание', 'plavanie', FALSE),
    ('Велоспорт', 'velosport', FALSE),
    ('Лыжи', 'lyzhi', FALSE),
    ('Туризм', 'turizm', FALSE),
    ('Йога', 'joga', FALSE),
    ('Танцы', 'tantsy', FALSE),
    ('Настольные игры', 'nastolnye-igry', FALSE),
    ('Другое', 'drugoe', FALSE)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Шаблоны мероприятий. Поля описываются JSON-схемой, поэтому новый формат
-- (спортивный или нет) добавляется одной строкой без изменения кода.
-- Формат поля: {key,label,type,required,options,unit,placeholder,help}
-- type: TEXT | TEXTAREA | NUMBER | SELECT | MULTISELECT | BOOLEAN
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_templates (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    icon VARCHAR(16),
    audience VARCHAR(20) NOT NULL DEFAULT 'ANY',            -- ANY | ORGANIZATION
    suggested_sport_slug VARCHAR(120),
    default_capacity INT NOT NULL DEFAULT 10,
    default_join_mode VARCHAR(50) NOT NULL DEFAULT 'APPROVAL',
    default_skill_level VARCHAR(50) NOT NULL DEFAULT 'ANY',
    default_duration_minutes INT NOT NULL DEFAULT 120,
    fields JSONB NOT NULL DEFAULT '[]',                      -- поля описания мероприятия
    registration_fields JSONB NOT NULL DEFAULT '[]',         -- вопросы участнику при заявке
    sort_order INT NOT NULL DEFAULT 100,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES event_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS min_age INT,
    ADD COLUMN IF NOT EXISTS max_age INT,
    ADD COLUMN IF NOT EXISTS fields JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS registration_fields JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS org_details JSONB;

ALTER TABLE events
    ADD CONSTRAINT chk_events_time CHECK (end_time > start_time),
    ADD CONSTRAINT chk_events_capacity CHECK (capacity > 0),
    ADD CONSTRAINT chk_events_join_mode CHECK (join_mode IN ('OPEN', 'APPROVAL')),
    ADD CONSTRAINT chk_events_price CHECK (price IS NULL OR price >= 0);

ALTER TABLE participations
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS decision_comment TEXT,
    ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS decided_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_participations_event_status ON participations(event_id, status);
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organizer_org_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(organizer_user_id);

-- ---------------------------------------------------------------------------
-- Стартовый набор шаблонов
-- ---------------------------------------------------------------------------
INSERT INTO event_templates
    (code, name, description, icon, audience, suggested_sport_slug, default_capacity,
     default_join_mode, default_skill_level, default_duration_minutes, fields, registration_fields, sort_order)
VALUES
('free', 'Свободный формат', 'Пустой шаблон: добавьте только то, что нужно, и свои собственные поля.', '✨',
 'ANY', NULL, 10, 'APPROVAL', 'ANY', 120, '[]'::jsonb, '[]'::jsonb, 10),

('training', 'Тренировка / занятие', 'Групповая тренировка, урок или разбор техники.', '🏋️',
 'ANY', NULL, 15, 'APPROVAL', 'ANY', 90,
 $json$[
  {"key":"trainer","label":"Тренер / ведущий","type":"TEXT","required":false,"placeholder":"Имя ведущего"},
  {"key":"format","label":"Формат","type":"SELECT","required":false,"options":["Групповое","Индивидуальное","Смешанное"]},
  {"key":"intensity","label":"Интенсивность","type":"SELECT","required":false,"options":["Лёгкая","Средняя","Высокая"]},
  {"key":"program","label":"План занятия","type":"TEXTAREA","required":false,"placeholder":"Разминка, основная часть, заминка…"}
 ]$json$::jsonb,
 $json$[
  {"key":"limitations","label":"Травмы и ограничения по здоровью","type":"TEXT","required":false,"placeholder":"Если есть"}
 ]$json$::jsonb, 20),

('match', 'Игра / товарищеский матч', 'Командные игры: футбол, баскетбол, волейбол и другие.', '⚽',
 'ANY', NULL, 10, 'APPROVAL', 'AMATEUR', 120,
 $json$[
  {"key":"playFormat","label":"Формат игры","type":"TEXT","required":false,"placeholder":"Например, 5x5"},
  {"key":"teamsCount","label":"Количество команд","type":"NUMBER","required":false},
  {"key":"surface","label":"Покрытие","type":"SELECT","required":false,"options":["Трава","Искусственный газон","Паркет / зал","Песок","Асфальт","Лёд","Другое"]},
  {"key":"ballProvided","label":"Мяч / инвентарь предоставляется","type":"BOOLEAN","required":false}
 ]$json$::jsonb,
 $json$[
  {"key":"position","label":"Позиция / амплуа","type":"TEXT","required":false,"placeholder":"Например, вратарь"}
 ]$json$::jsonb, 30),

('tournament', 'Турнир / соревнование', 'Матчи на вылет, круговая система, групповой этап и плей-офф.', '🏆',
 'ANY', NULL, 16, 'APPROVAL', 'AMATEUR', 240,
 $json$[
  {"key":"system","label":"Система проведения","type":"SELECT","required":true,"options":["На вылет (олимпийская)","Круговая","Швейцарская","Группы + плей-офф"]},
  {"key":"teamSize","label":"Игроков в команде","type":"NUMBER","required":false,"help":"1 — личный зачёт"},
  {"key":"matchDuration","label":"Длительность матча","type":"NUMBER","required":false,"unit":"мин"},
  {"key":"prizes","label":"Призы и награждение","type":"TEXT","required":false,"placeholder":"Кубки, медали, сертификаты"},
  {"key":"rules","label":"Регламент / правила","type":"TEXTAREA","required":false}
 ]$json$::jsonb,
 $json$[
  {"key":"teamName","label":"Название команды (или ваше имя)","type":"TEXT","required":true},
  {"key":"rating","label":"Рейтинг (если есть)","type":"NUMBER","required":false}
 ]$json$::jsonb, 40),

('race', 'Забег / заезд / массовый старт', 'Массовые старты с дистанцией, таймингом и стартовыми пакетами.', '🏃',
 'ORGANIZATION', 'beg', 100, 'APPROVAL', 'ANY', 180,
 $json$[
  {"key":"distanceKm","label":"Дистанция","type":"NUMBER","required":true,"unit":"км"},
  {"key":"routeType","label":"Тип трассы","type":"SELECT","required":false,"options":["Круг","Из точки А в точку Б","Несколько кругов"]},
  {"key":"chipTiming","label":"Электронный хронометраж","type":"BOOLEAN","required":false},
  {"key":"aidStations","label":"Пункты питания на трассе","type":"BOOLEAN","required":false},
  {"key":"cutoff","label":"Лимит времени","type":"NUMBER","required":false,"unit":"мин"}
 ]$json$::jsonb,
 $json$[
  {"key":"tshirt","label":"Размер футболки","type":"SELECT","required":false,"options":["XS","S","M","L","XL","XXL"]},
  {"key":"emergencyContact","label":"Контакт на случай ЧП (имя и телефон)","type":"TEXT","required":true}
 ]$json$::jsonb, 50),

('intellect', 'Интеллектуальная игра', 'Шахматы, настольные игры, квизы и турниры «за доской».', '♟️',
 'ANY', 'shahmaty', 12, 'APPROVAL', 'ANY', 180,
 $json$[
  {"key":"gameFormat","label":"Формат","type":"TEXT","required":false,"placeholder":"Блиц, рапид, командный квиз…"},
  {"key":"timeControl","label":"Контроль времени","type":"TEXT","required":false,"placeholder":"Например, 10+5"},
  {"key":"ratingRange","label":"Рейтинг участников","type":"TEXT","required":false,"placeholder":"Например, 1200–1800"},
  {"key":"equipmentProvided","label":"Инвентарь (доски, часы) предоставляется","type":"BOOLEAN","required":false}
 ]$json$::jsonb,
 $json$[
  {"key":"rating","label":"Ваш рейтинг (если есть)","type":"NUMBER","required":false}
 ]$json$::jsonb, 60),

('outdoor', 'Поход / прогулка / активный отдых', 'Маршруты, выезды на природу, велопрогулки.', '🥾',
 'ANY', 'turizm', 12, 'APPROVAL', 'ANY', 240,
 $json$[
  {"key":"route","label":"Маршрут","type":"TEXTAREA","required":true,"placeholder":"Откуда, куда, ключевые точки"},
  {"key":"distanceKm","label":"Протяжённость","type":"NUMBER","required":false,"unit":"км"},
  {"key":"difficulty","label":"Сложность","type":"SELECT","required":false,"options":["Лёгкая","Средняя","Сложная"]},
  {"key":"gear","label":"Что взять с собой","type":"TEXTAREA","required":false}
 ]$json$::jsonb,
 $json$[
  {"key":"experience","label":"Опыт подобных выходов","type":"SELECT","required":false,"options":["Нет опыта","Был(а) несколько раз","Опытный"]},
  {"key":"emergencyContact","label":"Контакт на случай ЧП (имя и телефон)","type":"TEXT","required":true}
 ]$json$::jsonb, 70),

('workshop', 'Мастер-класс / встреча', 'Не только спорт: лекции, мастер-классы, клубные встречи.', '🎓',
 'ANY', 'drugoe', 20, 'APPROVAL', 'ANY', 90,
 $json$[
  {"key":"topic","label":"Тема","type":"TEXT","required":true},
  {"key":"speaker","label":"Ведущий / спикер","type":"TEXT","required":false},
  {"key":"materials","label":"Что понадобится","type":"TEXTAREA","required":false},
  {"key":"online","label":"Есть онлайн-трансляция","type":"BOOLEAN","required":false}
 ]$json$::jsonb,
 $json$[
  {"key":"expectations","label":"Чего ждёте от встречи","type":"TEXTAREA","required":false}
 ]$json$::jsonb, 80)
ON CONFLICT (code) DO NOTHING;
