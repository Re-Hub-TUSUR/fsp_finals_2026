---
icon: lucide/webhook
---

# API

Полная интерактивная документация — **Swagger UI**: `http://localhost:8080/swagger-ui/index.html` (доступна и через порт 3000). Спецификация OpenAPI — `http://localhost:8080/v3/api-docs`.

Все пути имеют префикс `/api/v1`. Загруженные изображения отдаются по `/uploads/{uuid}.{ext}`.

## Авторизация

`POST /api/v1/auth/login` возвращает `token`. Дальше его передают в заголовке `Authorization: Bearer <token>`; в Swagger UI — кнопка **Authorize**. Токен действует 24 часа.

## Формат ошибок

```json
{ "error": { "code": "FORBIDDEN", "message": "Недостаточно прав для этого действия" } }
```

| Статус | Когда |
|--------|-------|
| `400` | Некорректные данные запроса |
| `401` | Нет или недействителен токен |
| `403` | Недостаточно прав (например, организация ещё не одобрена) |
| `404` | Объект не найден |
| `409` | Конфликт состояния (нет мест, повторная заявка, завершение до времени окончания) |

## Эндпоинты

| Группа | Методы и пути | Доступ |
|--------|---------------|--------|
| Публичное | `GET /public/stats` — сводка для приветственной страницы | публично |
| Auth | `POST /auth/login` · `POST /auth/register/user` · `POST /auth/register/organization` | публично |
| | `GET /auth/me` | токен |
| Профили | `GET /profiles/users/{id}` · `GET /profiles/organizations/{id}` · `GET /profiles/users/{id}/achievements` | публично |
| | `PATCH /profiles/users/{id}` · `PATCH /profiles/organizations/{id}` · `POST …/{id}/image` (multipart) | владелец |
| Каталог | `GET /events` (фильтры `sport`, `q`, `skillLevel`, `joinMode`, `template`, `lat`, `lng`, `radiusKm`) · `GET /events/{id}` · `GET /events/{id}/ics` | публично |
| | `GET /sports` · `GET /templates` · `GET /cities` · `GET /cities/nearest` | публично |
| | `POST /events` (в том числе `recurrenceRule`, `recurrenceIntervalDays`) | токен; организация — только одобренная |
| | `POST /events/{id}/complete` — завершить, перенести в архив и создать следующее занятие повторяющегося мероприятия | организатор мероприятия |
| Обсуждение | `GET /events/{id}/comments` | публично |
| | `POST /events/{id}/comments` · `PATCH /events/{id}/comments/{commentId}/hide` | токен; скрыть — админ, автор или организатор |
| Участие | `POST /events/{id}/join` (запись, заявка или очередь) · `DELETE /events/{id}/join` | токен |
| | `GET /events/{id}/participations` · `GET /events/{id}/participations/export` (CSV) · `PATCH /events/{id}/participations/{pid}` | организатор мероприятия |
| | `POST /events/{id}/checkin` (`{"ticketCode"}`) — отметка на входе | организатор мероприятия, админ |
| Личный кабинет | `GET /me/participations` · `GET /me/events` · `GET /me/achievements` | токен |
| | `GET /me/preferences` · `PUT /me/preferences` | токен |
| Друзья | `POST /friends/{userId}` · `DELETE /friends/{userId}` · `POST /friends/{userId}/accept` · `POST /friends/{userId}/reject` | токен |
| | `GET /me/friends` · `GET /me/friend-requests` · `GET /me/friend-search?email=` | токен |
| Подписки | `POST /organizations/{id}/subscription` · `DELETE /organizations/{id}/subscription` · `GET /me/subscriptions` | токен |
| Уведомления | `GET /me/notifications` · `PATCH /me/notifications/{id}/read` · `POST /me/notifications/read-all` | токен |
| | `GET /events/{id}/invite/friends` — друзья с состоянием «можно позвать / уже приглашён / уже идёт» | токен |
| | `POST /events/{id}/invite` (`{"friendIds", "message"}`) — пригласить друзей | токен |
| Рекомендации | `GET /recommendations` (`lat`, `lng`, `limit`) | токен |
| | `POST /recommendations/feedback` (`CLICK` или `DISMISS`) · `DELETE /recommendations/feedback/{eventId}` | токен |
| Admin | `GET /admin/organizations` · `POST /admin/organizations/{id}/approve` · `…/reject` | `ROLE_ADMIN` |
| | `GET /admin/events` (с результатом автопроверки, помеченные ⚠ — первыми) · `POST /admin/events/{id}/unpublish` · `…/publish` | `ROLE_ADMIN` |
| | `POST /admin/events/{id}/moderation/reviewed` — снять пометку ⚠ | `ROLE_ADMIN` |
| | `GET /admin/comments` | `ROLE_ADMIN` |

## Swagger

Операции сгруппированы по тегам в логическом порядке: `Public`, `Auth`, `Profiles`, `Events`, `Participation`, `Comments`, `Notifications`, `Friends`, `Subscriptions`, `Achievements`, `Me`, `Preferences`, `Recommendations`, `Templates`, `Sports`, `Cities`, `Admin`. Публичные операции показаны без «замка». Описание в начале страницы Swagger объясняет авторизацию, роли, билеты и очередь, повторяющиеся мероприятия, напоминания, автопроверку, формат ошибок, время и кэш карты.

## Мониторинг

`GET /actuator/health` (с состоянием БД), `/actuator/info`, `/actuator/metrics` — публичны.
