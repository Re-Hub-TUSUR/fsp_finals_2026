---
icon: lucide/database
---

# Модель данных

PostgreSQL 16 с расширением PostGIS. Схему создают и меняют только Flyway-миграции.

## Мероприятия и организации

```mermaid
erDiagram
    users ||--o{ organizations : "владеет"
    users ||--o{ events : "организатор, частное лицо"
    organizations ||--o{ events : "организатор, организация"
    sports ||--o{ events : "вид спорта"
    event_templates ||--o{ events : "шаблон, снимок полей"
    cities ||--o{ events : "ближайший город"

    organizations {
        bigint id PK
        bigint owner_user_id FK
        string status "PENDING, APPROVED, REJECTED"
        string inn UK
        string ogrn UK
        string kpp
    }
    events {
        bigint id PK
        bigint sport_id FK
        bigint template_id FK
        bigint organizer_user_id FK
        bigint organizer_org_id FK
        geography geog "GiST"
        string time_zone "IANA"
        string join_mode "OPEN, APPROVAL"
        string status "PUBLISHED, MODERATION, ARCHIVED"
        string moderation_status
        string recurrence_rule "NONE, WEEKLY, CUSTOM"
        int recurrence_interval_days "1-365"
        uuid recurrence_series_id
        bigint next_occurrence_id FK
        jsonb fields "снимок шаблона"
        jsonb details
        jsonb registration_fields
        jsonb org_details
    }
    event_templates {
        bigint id PK
        string code UK
        string audience "ANY, ORGANIZATION"
        jsonb fields
        jsonb registration_fields
    }
```

У события ровно один организатор: либо `organizer_user_id`, либо `organizer_org_id`. Статусы события — `PUBLISHED`, `UNPUBLISHED`, `CANCELLED`, `MODERATION`, `ARCHIVED`; статусы автопроверки — `CLEAN`, `PENDING`, `FLAGGED`, `REJECTED`, `REVIEWED`. Повторяющиеся занятия одной серии связаны общим `recurrence_series_id`; `next_occurrence_id` указывает на следующее занятие (`ON DELETE SET NULL`, уникален).

## Участие, обсуждение и социальные связи

```mermaid
erDiagram
    events ||--o{ participations : "заявки и участники"
    users ||--o{ participations : "участвует"
    events ||--o{ comments : "обсуждение"
    users ||--o{ comments : "автор"
    users ||--o{ friendships : "дружба"
    users ||--o{ organization_subscriptions : "подписывается"
    organizations ||--o{ organization_subscriptions : "подписчики"
    users ||--o{ notifications : "получает"
    events ||--o{ notifications : "о мероприятии"

    participations {
        bigint id PK
        bigint event_id FK
        bigint user_id FK
        string status "PENDING, CONFIRMED, REJECTED, CANCELLED, WAITLISTED"
        jsonb answers
        string ticket_code UK "SPT-XXXXXXXX"
        boolean checked_in
        bigint checked_in_by FK
    }
    friendships {
        bigint id PK
        bigint requester_id FK
        bigint recipient_id FK
        string status "PENDING, ACCEPTED"
    }
    organization_subscriptions {
        bigint user_id PK
        bigint organization_id PK
    }
    notifications {
        bigint id PK
        bigint user_id FK
        string type "EVENT_INVITE, EVENT_REMINDER, ..."
        string link_url
        bigint sender_user_id FK
        bigint event_id FK
        boolean is_read
    }
```

## Персонализация и рекомендации

```mermaid
erDiagram
    users ||--o{ user_interests : "интересы"
    sports ||--o{ user_interests : "выбран"
    users ||--|| user_preferences : "предпочтения"
    cities ||--o{ user_preferences : "домашний город"
    users ||--o{ user_affinities : "накопленный интерес"
    users ||--o{ event_feedback : "не интересно"
    events ||--o{ event_feedback : "скрыто"

    user_preferences {
        bigint user_id PK
        bigint home_city_id FK
        int max_distance_km
        jsonb preferred_times
        string skill_level
        int max_price
        int birth_year
    }
    user_affinities {
        bigint user_id PK
        string kind PK "SPORT, TEMPLATE, ORGANIZATION, ORGANIZER_USER, TIME_SLOT"
        bigint target_id PK
        double score
    }
    cities {
        bigint id PK
        string name
        string time_zone
        geography geog
    }
```


Отдельно, без внешних ключей: `recommendation_log` (журнал показов и действий, секционирован по месяцам) и два материализованных представления — `mv_event_popularity` и `mv_sport_similarity`.

## Ограничения целостности

- `CHECK`: у события ровно один организатор; `end_time > start_time`; `capacity > 0`.
- Уникальность `(event_id, user_id)` в участиях и `ticket_code` у билетов.
- Частичные уникальные индексы по ИНН и ОГРН организаций.
- В `friendships` — `CHECK (requester_id <> recipient_id)`, статус из набора `PENDING` и `ACCEPTED`, уникальный индекс по неупорядоченной паре `(LEAST, GREATEST)`: одна строка на пару пользователей.
- У подписок составной первичный ключ `(user_id, organization_id)`.
- Частичный уникальный индекс `uq_notifications_event_reminder (user_id, event_id, type) WHERE type = 'EVENT_REMINDER'`: одно напоминание на участника и мероприятие.
- В `events`: `CHECK` на `recurrence_interval_days` от 1 до 365, уникальность `next_occurrence_id` (у занятия не больше одного предыдущего), индекс по `recurrence_series_id`.

## Миграции

Каталог `backend/src/main/resources/db/migration`:

| Файл | Содержимое |
|------|------------|
| `V1__init_schema.sql` | Пользователи, организации, виды спорта, мероприятия, участия, комментарии |
| `V2__event_constructor.sql` | Шаблоны конструктора, детали организаций, поля участия, справочник видов спорта |
| `V3__recommendations.sql` | PostGIS, города и часовые пояса, интересы, сигналы, обратная связь, лог, материализованные представления |
| `V4__registration_profiles.sql` | Реквизиты организаций (ИНН, ОГРН, КПП) и их уникальность |
| `V5__event_moderation.sql` | Результат автопроверки мероприятия: статус, причина, находки фильтра, модель ИИ |
| `V6__friendships.sql` | Дружба пользователей |
| `V7__organization_subscriptions.sql` | Подписки на организации |
| `V8__tickets_and_checkin.sql` | Код билета, отметка о входе; коды для уже подтверждённых участий |
| `V9__notifications_and_invites.sql` | Центр уведомлений и приглашения друзей (демо-уведомления — в `R__demo_data.sql`) |
| `V10__number_field_bounds.sql` | Границы числовых полей шаблонов (расстояние, число команд и игроков, длительность) |
| `V11__recurring_events.sql` | Повторяющиеся мероприятия: правило, серия, ссылка на следующее занятие |
| `V12__custom_recurrence_interval.sql` | Свой интервал повторения в днях (1–365), еженедельные получают 7 |
| `V13__event_reminders.sql` | Уникальный индекс напоминаний о мероприятиях |
| `V14__foreign_key_indexes.sql` | Индексы внешних ключей и частых выборок (владелец организации, уведомления, ссылки на пользователя); удаление дублирующих индексов |
| `R__demo_data.sql` | Повторяемая миграция: идемпотентные демо-данные |

!!! note "Порядок миграций"
    Включён `spring.flyway.out-of-order`, потому что `V5` пришла из слияния ветки позже уже применённой `V6`. На чистой базе миграции идут в обычном порядке.
