---
icon: lucide/terminal
---

# Локальный запуск

## Всё в Docker

Нужен запущенный **Docker Desktop**. В корне проекта:

```bash
# 1. (необязательно) ключи — без них приложение работает с заглушками
cp .env.example .env
#    впишите VITE_2GIS_KEY (https://platform.2gis.ru) и ROUTERAI_API_KEY

# 2. Сборка и запуск базы, Redis, бэкенда и веб-клиента
docker compose up --build -d

# 3. Проверка состояния
docker compose ps
```

Ключ 2GIS встраивается во фронтенд **при сборке**, поэтому после его изменения нужна пересборка: `docker compose up --build -d`.

### Доступные сервисы

| Сервис | Ссылка | Описание |
|--------|--------|----------|
| Веб-приложение | `http://localhost:3000` | Карта, каталог, конструктор, рекомендации, профили, модерация |
| Swagger UI | `http://localhost:8080/swagger-ui/index.html` | Интерактивная документация OpenAPI (и через порт 3000) |
| OpenAPI JSON | `http://localhost:8080/v3/api-docs` | Спецификация для генерации клиентов |
| Healthcheck | `http://localhost:8080/actuator/health` | Состояние бэкенда и базы данных |
| PostgreSQL | `localhost:5432` | БД `sportikus`, пользователь `sportikus_user` |

### Сброс данных

Схема и демо-данные создаются миграциями при старте. После обновления схемы или демо-данных пересоздайте базу и загрузки:

```bash
docker compose down -v && docker compose up --build -d
```

Данные хранятся в двух volume: `postgres_data` (база) и `profile_uploads` (фото профилей и логотипы). Обычный `docker compose up -d --build` данные не стирает.

## Разработка без Docker

Для бэкенда нужны **Java 21**, **Maven 3.9+** и PostgreSQL **с расширением PostGIS**: обычный PostgreSQL не подойдёт (миграция выполняет `CREATE EXTENSION postgis`). Проще всего поднять из compose только базу и необязательный Redis:

```bash
docker compose up -d postgres redis
```

```bash
# Backend, http://localhost:8080
cd backend
mvn spring-boot:run
```

```bash
# Frontend, http://localhost:5173
cd frontend
npm install
npm run dev
```

Vite проксирует запросы `/api` на `http://localhost:8080`. Ключ 2GIS берётся из `.env` в корне проекта или из `frontend/.env` (приоритетнее).

## Переменные окружения

Полный пример — `.env.example`.

| Переменная | Где используется | По умолчанию |
|------------|------------------|--------------|
| `VITE_2GIS_KEY` | Сборка фронтенда | пусто (вместо карты заглушка) |
| `VITE_2GIS_STYLE_ID`, `VITE_2GIS_STYLE_ID_DARK` | Сборка фронтенда | пусто (стандартный стиль 2GIS) |
| `VITE_API_URL` | Фронтенд | `/api/v1` |
| `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` | Backend | `jdbc:postgresql://localhost:5432/sportikus`, `sportikus_user`, `sportikus_password` |
| `REDIS_HOST`, `REDIS_PORT` | Backend | `localhost`, `6379` |
| `MAP_CACHE_ENABLED` | Backend | `true` |
| `JWT_SECRET` | Backend | значение для разработки — **замените в реальном окружении** |
| `UPLOAD_DIR` | Backend | `uploads` (в Docker `/app/uploads`) |
| `ROUTERAI_API_KEY` | Backend (автопроверка) | пусто: работает только фильтр, сомнительное помечается ⚠ |
| `MODERATION_LLM_MODEL` | Backend (автопроверка) | `google/gemini-2.5-flash-lite` |
| `MODERATION_ENABLED` | Backend (автопроверка) | `true` |

Файл `.env` не попадает в git. Ключи в репозиторий не коммитятся.

## Эта документация

Сайт документации и PDF собираются из каталога `docs-zensical/`. Инструкции — в `docs-zensical/README.md`.
