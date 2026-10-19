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
| Auth | `POST /auth/login` · `POST /auth/register/user` · `POST /auth/register/organization` | публично |
| | `GET /auth/me` | токен |
| Профили | `GET /profiles/users/{id}` · `GET /profiles/organizations/{id}` · `GET /profiles/users/{id}/achievements` | публично |
| | `PATCH /profiles/users/{id}` · `PATCH /profiles/organizations/{id}` · `POST …/{id}/image` (multipart) | владелец |
| Каталог | `GET /events` (фильтры `sport`, `q`, `skillLevel`, `joinMode`, `template`, `lat`, `lng`, `radiusKm`) · `GET /events/{id}` · `GET /events/{id}/ics` | публично |
| | `GET /sports` · `GET /templates` · `GET /cities` · `GET /cities/nearest` | публично |
| | `POST /events` | токен; организация — только одобренная |
| | `POST /events/{id}/complete` — завершить и перенести в архив | организатор мероприятия |
| Обсуждение | `GET /events/{id}/comments` | публично |
| | `POST /events/{id}/comments` · `PATCH /events/{id}/comments/{commentId}/hide` | токен; скрыть — админ, автор или организатор |
| Участие | `POST /events/{id}/join` · `DELETE /events/{id}/join` | токен |
| | `GET /events/{id}/participations` · `PATCH /events/{id}/participations/{pid}` | организатор мероприятия |
| | `POST /events/{id}/checkin` (`{"ticketCode"}`) — отметка на входе | организатор мероприятия, админ |
| Личный кабинет | `GET /me/participations` · `GET /me/events` · `GET /me/achievements` | токен |
| | `GET /me/preferences` · `PUT /me/preferences` | токен |
| Друзья | `POST /friends/{userId}` · `DELETE /friends/{userId}` · `POST /friends/{userId}/accept` · `POST /friends/{userId}/reject` | токен |
| | `GET /me/friends` · `GET /me/friend-requests` · `GET /me/friend-search?email=` | токен |
| Подписки | `POST /organizations/{id}/subscription` · `DELETE /organizations/{id}/subscription` · `GET /me/subscriptions` | токен |
| Рекомендации | `GET /recommendations` (`lat`, `lng`, `limit`) | токен |
| | `POST /recommendations/feedback` (`CLICK` или `DISMISS`) · `DELETE /recommendations/feedback/{eventId}` | токен |
| Admin | `GET /admin/organizations` · `POST /admin/organizations/{id}/approve` · `…/reject` | `ROLE_ADMIN` |
| | `GET /admin/events` (с результатом автопроверки, помеченные ⚠ — первыми) · `POST /admin/events/{id}/unpublish` · `…/publish` | `ROLE_ADMIN` |
| | `POST /admin/events/{id}/moderation/reviewed` — снять пометку ⚠ | `ROLE_ADMIN` |
| | `GET /admin/comments` | `ROLE_ADMIN` |

## Мониторинг

`GET /actuator/health` (с состоянием БД), `/actuator/info`, `/actuator/metrics` — публичны.
