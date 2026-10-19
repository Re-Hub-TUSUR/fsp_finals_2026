-- V3__recommendations.sql
-- Рекомендации в масштабе страны: геоиндекс PostGIS, города и часовые пояса,
-- интересы пользователей, накопленные сигналы, обратная связь и лог показов.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Города: геокорзина для «популярного рядом», часовой пояс события и домашний город
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cities (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(120),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    time_zone VARCHAR(64) NOT NULL,
    population INT,
    geog geography(Point, 4326) GENERATED ALWAYS AS (geography(ST_SetSRID(ST_MakePoint(lng, lat), 4326))) STORED,
    CONSTRAINT uq_cities_name_region UNIQUE (name, region)
);
CREATE INDEX IF NOT EXISTS idx_cities_geog ON cities USING GIST (geog);

INSERT INTO cities (name, region, lat, lng, time_zone, population) VALUES
    ('Калининград', 'Калининградская область', 54.7104, 20.4522, 'Europe/Kaliningrad', 490000),
    ('Москва', 'Москва', 55.7558, 37.6173, 'Europe/Moscow', 13100000),
    ('Санкт-Петербург', 'Санкт-Петербург', 59.9311, 30.3609, 'Europe/Moscow', 5600000),
    ('Мурманск', 'Мурманская область', 68.9585, 33.0827, 'Europe/Moscow', 270000),
    ('Архангельск', 'Архангельская область', 64.5393, 40.5170, 'Europe/Moscow', 300000),
    ('Нижний Новгород', 'Нижегородская область', 56.2965, 43.9361, 'Europe/Moscow', 1200000),
    ('Казань', 'Республика Татарстан', 55.7961, 49.1064, 'Europe/Moscow', 1300000),
    ('Воронеж', 'Воронежская область', 51.6720, 39.1843, 'Europe/Moscow', 1050000),
    ('Ростов-на-Дону', 'Ростовская область', 47.2357, 39.7015, 'Europe/Moscow', 1140000),
    ('Краснодар', 'Краснодарский край', 45.0355, 38.9753, 'Europe/Moscow', 1100000),
    ('Сочи', 'Краснодарский край', 43.5855, 39.7231, 'Europe/Moscow', 450000),
    ('Киров', 'Кировская область', 58.6036, 49.6680, 'Europe/Kirov', 470000),
    ('Волгоград', 'Волгоградская область', 48.7080, 44.5133, 'Europe/Volgograd', 1000000),
    ('Астрахань', 'Астраханская область', 46.3497, 48.0408, 'Europe/Astrakhan', 470000),
    ('Саратов', 'Саратовская область', 51.5336, 46.0343, 'Europe/Saratov', 900000),
    ('Ульяновск', 'Ульяновская область', 54.3142, 48.4031, 'Europe/Ulyanovsk', 620000),
    ('Самара', 'Самарская область', 53.1959, 50.1002, 'Europe/Samara', 1160000),
    ('Уфа', 'Республика Башкортостан', 54.7388, 55.9721, 'Asia/Yekaterinburg', 1140000),
    ('Пермь', 'Пермский край', 58.0105, 56.2502, 'Asia/Yekaterinburg', 1030000),
    ('Оренбург', 'Оренбургская область', 51.7682, 55.0969, 'Asia/Yekaterinburg', 550000),
    ('Екатеринбург', 'Свердловская область', 56.8389, 60.6057, 'Asia/Yekaterinburg', 1540000),
    ('Челябинск', 'Челябинская область', 55.1644, 61.4368, 'Asia/Yekaterinburg', 1180000),
    ('Тюмень', 'Тюменская область', 57.1522, 65.5272, 'Asia/Yekaterinburg', 850000),
    ('Сургут', 'Ханты-Мансийский АО', 61.2540, 73.3962, 'Asia/Yekaterinburg', 400000),
    ('Омск', 'Омская область', 54.9885, 73.3242, 'Asia/Omsk', 1110000),
    ('Новосибирск', 'Новосибирская область', 55.0084, 82.9357, 'Asia/Novosibirsk', 1630000),
    ('Барнаул', 'Алтайский край', 53.3548, 83.7698, 'Asia/Barnaul', 630000),
    ('Томск', 'Томская область', 56.4846, 84.9476, 'Asia/Tomsk', 570000),
    ('Кемерово', 'Кемеровская область', 55.3547, 86.0873, 'Asia/Novokuznetsk', 550000),
    ('Новокузнецк', 'Кемеровская область', 53.7557, 87.1099, 'Asia/Novokuznetsk', 540000),
    ('Красноярск', 'Красноярский край', 56.0153, 92.8932, 'Asia/Krasnoyarsk', 1190000),
    ('Абакан', 'Республика Хакасия', 53.7212, 91.4424, 'Asia/Krasnoyarsk', 190000),
    ('Норильск', 'Красноярский край', 69.3558, 88.1893, 'Asia/Krasnoyarsk', 180000),
    ('Иркутск', 'Иркутская область', 52.2870, 104.3050, 'Asia/Irkutsk', 610000),
    ('Улан-Удэ', 'Республика Бурятия', 51.8335, 107.5841, 'Asia/Irkutsk', 440000),
    ('Чита', 'Забайкальский край', 52.0340, 113.4994, 'Asia/Chita', 350000),
    ('Якутск', 'Республика Саха (Якутия)', 62.0355, 129.6755, 'Asia/Yakutsk', 360000),
    ('Благовещенск', 'Амурская область', 50.2907, 127.5272, 'Asia/Yakutsk', 240000),
    ('Хабаровск', 'Хабаровский край', 48.4802, 135.0719, 'Asia/Vladivostok', 610000),
    ('Владивосток', 'Приморский край', 43.1155, 131.8855, 'Asia/Vladivostok', 600000),
    ('Магадан', 'Магаданская область', 59.5638, 150.8035, 'Asia/Magadan', 90000),
    ('Южно-Сахалинск', 'Сахалинская область', 46.9591, 142.7380, 'Asia/Sakhalin', 180000),
    ('Петропавловск-Камчатский', 'Камчатский край', 53.0370, 158.6559, 'Asia/Kamchatka', 160000),
    ('Анадырь', 'Чукотский АО', 64.7337, 177.5089, 'Asia/Anadyr', 15000)
ON CONFLICT (name, region) DO NOTHING;

-- ---------------------------------------------------------------------------
-- События: геоколонка (вычисляемая) + GiST-индекс, город и местный часовой пояс
-- ---------------------------------------------------------------------------
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
        GENERATED ALWAYS AS (geography(ST_SetSRID(ST_MakePoint(lng, lat), 4326))) STORED,
    ADD COLUMN IF NOT EXISTS city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS time_zone VARCHAR(64);

-- Индекс только по актуальным опубликованным событиям — именно по ним ищут рекомендации и каталог
CREATE INDEX IF NOT EXISTS idx_events_geog_published ON events USING GIST (geog) WHERE status = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS idx_events_city_start ON events (city_id, start_time) WHERE status = 'PUBLISHED';

UPDATE events e SET city_id = (SELECT c.id FROM cities c ORDER BY c.geog <-> e.geog LIMIT 1)
WHERE e.city_id IS NULL;
UPDATE events e SET time_zone = c.time_zone FROM cities c WHERE c.id = e.city_id AND e.time_zone IS NULL;

-- ---------------------------------------------------------------------------
-- Явные интересы и предпочтения пользователя (заполняются при регистрации и в профиле)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_interests (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sport_id BIGINT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, sport_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    skill_level VARCHAR(50),
    home_city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    home_lat DOUBLE PRECISION,
    home_lng DOUBLE PRECISION,
    max_distance_km INT NOT NULL DEFAULT 25,
    preferred_times JSONB NOT NULL DEFAULT '[]',  -- MORNING | DAY | EVENING | WEEKEND
    max_price NUMERIC(10, 2),
    birth_year INT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pref_distance CHECK (max_distance_km BETWEEN 1 AND 300)
);

-- ---------------------------------------------------------------------------
-- Неявные сигналы. События живут несколько дней, поэтому учимся на устойчивых сущностях:
-- вид спорта, формат, организатор, время суток. score — сумма весов действий
-- с экспоненциальным затуханием (период полураспада 90 дней), отсчитанным от updated_at.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_affinities (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL,          -- SPORT | TEMPLATE | ORGANIZATION | ORGANIZER_USER | TIME_SLOT
    target_id BIGINT NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, kind, target_id)
);

CREATE TABLE IF NOT EXISTS event_feedback (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL,          -- DISMISSED
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, event_id)
);

-- Лог показов и действий: метрики (CTR, доля записей) и обучающая выборка для модели ранжирования.
-- Секционирован по месяцам; секции создаёт фоновая задача, DEFAULT ловит всё остальное.
CREATE TABLE IF NOT EXISTS recommendation_log (
    id BIGSERIAL,
    request_id UUID NOT NULL,
    user_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL,        -- IMPRESSION | CLICK | DISMISS | JOIN
    position INT,
    score DOUBLE PRECISION,
    model VARCHAR(40),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE TABLE IF NOT EXISTS recommendation_log_default PARTITION OF recommendation_log DEFAULT;
CREATE INDEX IF NOT EXISTS idx_reclog_user_time ON recommendation_log (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Предрассчитанные агрегаты (обновляются фоновыми задачами)
-- ---------------------------------------------------------------------------

-- Популярность актуальных событий: подтверждённые участники, свежие записи за 48 ч, заявки
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_event_popularity AS
SELECT e.id AS event_id,
       e.city_id,
       (COUNT(p.id) FILTER (WHERE p.status = 'CONFIRMED')
        + 2.0 * COUNT(p.id) FILTER (WHERE p.status IN ('CONFIRMED', 'PENDING') AND p.created_at > now() - INTERVAL '48 hours')
        + 0.5 * COUNT(p.id) FILTER (WHERE p.status = 'PENDING'))::DOUBLE PRECISION AS score
FROM events e
LEFT JOIN participations p ON p.event_id = e.id
WHERE e.status = 'PUBLISHED' AND e.end_time > now()
GROUP BY e.id, e.city_id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_event_popularity ON mv_event_popularity (event_id);

-- «Похожие люди ходят»: совместная встречаемость видов спорта у одних и тех же пользователей
-- (интересы + записи), нормированная по косинусу
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sport_similarity AS
WITH user_sport AS (
    SELECT user_id, sport_id FROM user_interests
    UNION
    SELECT p.user_id, e.sport_id
    FROM participations p JOIN events e ON e.id = p.event_id
    WHERE p.status IN ('CONFIRMED', 'PENDING')
),
counts AS (SELECT sport_id, COUNT(*) AS n FROM user_sport GROUP BY sport_id),
pairs AS (
    SELECT a.sport_id AS sport_a, b.sport_id AS sport_b, COUNT(*) AS co
    FROM user_sport a JOIN user_sport b ON a.user_id = b.user_id AND a.sport_id <> b.sport_id
    GROUP BY a.sport_id, b.sport_id
)
SELECT p.sport_a AS sport_id,
       p.sport_b AS similar_sport_id,
       p.co,
       (p.co / sqrt(ca.n::DOUBLE PRECISION * cb.n))::DOUBLE PRECISION AS score
FROM pairs p
JOIN counts ca ON ca.sport_id = p.sport_a
JOIN counts cb ON cb.sport_id = p.sport_b;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_sport_similarity ON mv_sport_similarity (sport_id, similar_sport_id);
