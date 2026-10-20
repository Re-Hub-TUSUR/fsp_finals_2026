---
icon: lucide/wrench
---

# Инженерия

Раздел описывает текущую реализацию монорепозитория. Поведение продукта для пользователя описано в разделах «Продукт» и «Бизнес»; здесь — как это устроено внутри.

| Страница | О чём |
|----------|-------|
| [Архитектура](architecture.md) | Принципы, компоненты, модули backend, ключевые потоки (участие, очередь, билеты, повторы, уведомления), безопасность, архитектурные решения |
| [Клиент](frontend.md) | Гость и возврат после входа, обучающий тур, тест интересов, сканер, поведение при сбоях сети |
| [Модель данных](data-model.md) | ER-диаграмма, ограничения целостности, миграции V1–V13 |
| [API](api.md) | Группы эндпоинтов, доступ, формат ошибок |
| [Конструктор мероприятий](constructor.md) | Шаблоны, поля, анкета участника, валидатор |
| [Рекомендательная система](recommendations.md) | Кандидаты, ранжирование, сигналы, кэш, фоновые задачи |
| [Автопроверка мероприятий](moderation.md) | Фильтр запрещённых тем и проверка ИИ |
| [Локальный запуск](local-start.md) | Docker, разработка без Docker, переменные окружения |
| [Тестирование](testing.md) | Что покрыто тестами бэкенда и фронтенда |
| [Ограничения и развитие](limitations.md) | Что не реализовано и что менять при росте нагрузки |

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Java 21, Spring Boot 3.3, Spring Data JPA, Spring Security (JWT), Flyway, Springdoc OpenAPI |
| База данных | PostgreSQL 16 + PostGIS (геопоиск, материализованные представления, секционированный журнал) |
| Кэш | Redis 7 (кэш карты; необязателен) |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, React Router, 2GIS MapGL JS API, Lucide Icons, `qrcode` и `html5-qrcode` для билетов |
| Тесты | JUnit 5 + AssertJ (backend), Vitest + Testing Library (frontend) |
| DevOps | Docker, Docker Compose, Nginx |

## Структура репозитория

```text
.
├── backend/                     # Spring Boot (package-by-feature, ru.sportikus)
│   └── src/main
│       ├── java/ru/sportikus/
│       │   ├── auth, security   # вход, регистрация, JWT
│       │   ├── user, organization, sport, city
│       │   ├── template, form   # конструктор: шаблоны, поля, валидатор
│       │   ├── event, participation, comment, admin
│       │   ├── friendship, subscription, achievement
│       │   ├── notification     # уведомления, приглашения, напоминания (jobs)
│       │   ├── stats            # публичная сводка для приветственной страницы
│       │   ├── moderation       # автопроверка: фильтр + ИИ (RouterAI)
│       │   ├── preference, recommendation
│       │   └── common, config   # ошибки, Security, OpenAPI, планировщик
│       └── resources/db/migration   # V1–V13 + R__demo_data
├── frontend/                    # React + Vite + TypeScript
├── docs/architecture.md         # технический обзор (дублирует раздел «Инженерия»)
├── docs-zensical/               # эта документация (Zensical)
├── scripts/build_pdf.py         # сборка PDF из этой документации
└── docker-compose.yml           # postgres (PostGIS), redis, backend, frontend
```
