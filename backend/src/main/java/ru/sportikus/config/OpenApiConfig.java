package ru.sportikus.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    /** Эндпоинты, доступные без токена (должны совпадать с правилами в {@link SecurityConfig}). */
    private static final Set<String> PUBLIC_GET = Set.of(
            "/api/v1/public/stats", "/api/v1/sports", "/api/v1/templates", "/api/v1/cities", "/api/v1/cities/nearest",
            "/api/v1/events", "/api/v1/events/{id}", "/api/v1/events/{id}/ics", "/api/v1/events/{eventId}/comments",
            "/api/v1/profiles/users/{id}", "/api/v1/profiles/users/{id}/achievements", "/api/v1/profiles/organizations/{id}");
    private static final Set<String> PUBLIC_POST = Set.of(
            "/api/v1/auth/login", "/api/v1/auth/register/user", "/api/v1/auth/register/organization");

    private static final String DESCRIPTION = """
            REST API платформы спортивных активностей **Sportikus** — «от желания потренироваться к конкретной компании за 2 клика».
            Финал Чемпионата России по продуктовому программированию (ФСП, кейс Столото).

            ### Как авторизоваться в Swagger
            1. Выполните `POST /api/v1/auth/login` (например, `user@sport.ru` / `password123`) или зарегистрируйтесь через `/auth/register/*`.
            2. Скопируйте `token` из ответа, нажмите **Authorize** и вставьте его (префикс `Bearer` добавляется автоматически).
            3. Замок у операции означает, что нужен токен; операции без замка публичны (каталог, карточка события, справочники, профили и достижения пользователя, чтение обсуждения).

            ### Демо-аккаунты (пароль у всех `password123`)
            | Роль | E-mail |
            |---|---|
            | Пользователь | `user@sport.ru`, `olga@sport.ru`, `pro@sport.ru`, `masha@sport.ru` (Москва) |
            | Организация (одобрена) | `enisey@sport.ru` |
            | Организация (на модерации) | `ladya@sport.ru` |
            | Администратор | `admin@sport.ru` |

            ### Роли и доступ
            * **ROLE_USER** — создаёт мероприятия от своего имени, записывается, подаёт заявки, встаёт в очередь, получает рекомендации и достижения, пишет в обсуждения, дружит и подписывается на организации.
            * **ROLE_ORGANIZER** — публикует мероприятия от имени организации, **только после одобрения** администратором (иначе `403`); отвечает в обсуждениях со значком «Организатор», принимает заявки и отмечает участников на входе. Сам на мероприятия не записывается.
            * **ROLE_ADMIN** — модерация организаций, мероприятий и комментариев (`/api/v1/admin/**`); сам не создаёт мероприятия, не участвует, не дружит и не подписывается.

            ### Участие, очередь и билеты
            Статусы участия: `PENDING` (заявка ждёт организатора), `CONFIRMED`, `REJECTED`, `CANCELLED`, `WAITLISTED` (очередь, когда мест нет).
            Когда место освобождается, все из очереди получают уведомление, а место достаётся первому, кто повторит `POST /events/{id}/join`.
            Подтверждённому участнику выдаётся постоянный код билета `SPT-XXXXXXXX` (из него строится QR). Организатор отмечает вход
            через `POST /events/{id}/checkin`: вход по билету одноразовый, повтор возвращает `ALREADY_CHECKED_IN`.
            Все операции с местами выполняются под блокировкой мероприятия — последнее место нельзя выдать дважды.

            Организатор может выгрузить список участников в CSV (`GET /events/{id}/participations/export`): статусы, билеты, явка и ответы анкеты.

            ### Повторяющиеся мероприятия
            При создании можно задать `recurrenceRule`: `NONE` (по умолчанию), `WEEKLY` (раз в 7 дней) или `CUSTOM` с `recurrenceIntervalDays`
            (1–365 дней). Следующее занятие создаётся автоматически, когда организатор завершает текущее
            (`POST /events/{id}/complete`): копия с тем же описанием, местом, ценой и анкетой, датой сдвинутой на интервал
            по местному времени площадки (но не в прошлое). Ссылка на неё — `nextOccurrenceId` в карточке завершённого мероприятия.
            Участники копируются не автоматически: на новое занятие записываются заново.

            ### Социальные функции и уведомления
            Друзья (`/friends/**`, `/me/friends`), подписки на организации (`/organizations/{id}/subscription`), достижения (`/me/achievements`)
            и центр уведомлений (`/me/notifications`): приглашения на мероприятия, решения организатора, заявки в друзья, освободившиеся места из очереди
            и **напоминание за сутки** (`EVENT_REMINDER`). Напоминание создаёт фоновая задача раз в 5 минут для каждого подтверждённого участника
            опубликованного мероприятия, которое начинается в ближайшие 24 часа; на пару «участник + мероприятие» оно приходит ровно один раз.

            ### Публичные данные
            `GET /api/v1/public/stats` — сводка для приветственной страницы без входа: предстоящие мероприятия, участники, виды спорта, одобренные организации.
            Гость видит лендинг и вход, а остальное приложение открывается после авторизации.

            ### Автопроверка мероприятий
            `POST /api/v1/events` сразу проверяет текст: фильтр запрещённых тем (политика, алкоголь, табак, наркотики, ставки,
            дискриминация, насилие, 18+, финансовые схемы, мат), а при сомнении — ИИ через RouterAI (обычно 1–3 секунды
            в том же запросе). Отклонённое мероприятие возвращается со `status = UNPUBLISHED` и причиной в `unpublishReason`.
            Сомнительное, но одобренное ИИ публикуется и попадает администратору с пометкой ⚠ (`moderation.status = FLAGGED`).

            ### Формат ошибок
            Все ошибки возвращаются в одном формате: `{"error": {"code": "NOT_FOUND", "message": "Мероприятие не найдено"}}`.
            Коды: `BAD_REQUEST`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `METHOD_NOT_ALLOWED`, `INTERNAL_ERROR`.

            ### Время и география
            Время передаётся в UTC (ISO-8601). У каждого мероприятия есть `timeZone` и `cityName` — по ним клиент показывает местное время площадки.
            Геопоиск работает на PostGIS по всей стране: `lat`, `lng`, `radiusKm` (до 300 км).
            Список мероприятий для карты кэшируется в Redis на 60 секунд, поэтому число занятых мест в списке может отставать до минуты;
            карточка мероприятия (`GET /events/{id}`) всегда возвращает точные значения. Redis необязателен: без него запросы идут в БД.
            """;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Sportikus Platform API")
                        .version("1.1.0")
                        .description(DESCRIPTION)
                        .contact(new Contact()
                                .name("Sportikus Team")
                                .url("https://github.com/Re-Hub-TUSUR/fsp_finals_2026")))
                .tags(orderedTags())
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                .components(new Components()
                        .addSecuritySchemes(BEARER,
                                new SecurityScheme()
                                        .name(BEARER)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT из ответа `POST /api/v1/auth/login`. Срок жизни — 24 часа.")));
    }

    /** Теги в логическом порядке, с описаниями. Единственный источник: @Tag на контроллерах только задаёт принадлежность. */
    private static List<Tag> orderedTags() {
        return List.of(
                new Tag().name("Public").description("Сводка платформы для приветственной страницы (доступна без входа)"),
                new Tag().name("Auth").description("Вход, регистрация пользователей и организаций, текущий профиль"),
                new Tag().name("Profiles").description("Публичные профили пользователей и организаций, редактирование, загрузка фото и логотипа"),
                new Tag().name("Events").description("Каталог и создание мероприятий (от пользователя и от организации), повторяющиеся занятия, завершение и архив, экспорт в календарь"),
                new Tag().name("Participation").description("Запись, заявки и очередь; решения организатора; QR-билеты, отметка на входе и CSV-экспорт участников"),
                new Tag().name("Comments").description("Обсуждение под мероприятием: вопросы участников, ответы организатора со значком, модерация сообщений"),
                new Tag().name("Notifications").description("Центр уведомлений пользователя, напоминания о мероприятиях и приглашения друзей"),
                new Tag().name("Friends").description("Друзья: заявки, принятие, поиск по e-mail; друзья видны на карточках мероприятий"),
                new Tag().name("Subscriptions").description("Подписки пользователей на одобренные организации"),
                new Tag().name("Achievements").description("Достижения за активность: участие, дружба, организация мероприятий, виды спорта"),
                new Tag().name("Me").description("Личный кабинет: мои заявки и билеты, мои мероприятия и архив"),
                new Tag().name("Preferences").description("Интересы, год рождения, уровень, удобное время, город и радиус поиска — основа рекомендаций"),
                new Tag().name("Recommendations").description("Персональные рекомендации с объяснением причин и обратной связью"),
                new Tag().name("Templates").description("Конструктор мероприятий: шаблоны с настраиваемыми полями"),
                new Tag().name("Sports").description("Справочник видов спорта и активностей (включая добавленные пользователями)"),
                new Tag().name("Cities").description("Справочник городов и часовых поясов"),
                new Tag().name("Admin").description("Модерация организаций, мероприятий и комментариев (только ROLE_ADMIN)"));
    }

    /**
     * Снимает «замок» с публичных операций (глобальное требование токена для них не действует) и приводит теги
     * к одному списку в заданном порядке: springdoc склеивает теги из @Tag контроллеров и из конфигурации,
     * и без этого они дублируются, а порядок получается произвольным.
     */
    @Bean
    public OpenApiCustomizer publicEndpointsCustomizer() {
        return openApi -> {
            openApi.getPaths().forEach((path, item) -> {
                if (item.getGet() != null && PUBLIC_GET.contains(path)) {
                    item.getGet().setSecurity(List.of());
                }
                if (item.getPost() != null && PUBLIC_POST.contains(path)) {
                    item.getPost().setSecurity(List.of());
                }
            });

            List<Tag> tags = new ArrayList<>(orderedTags());
            Set<String> known = new HashSet<>();
            tags.forEach(tag -> known.add(tag.getName()));
            // Тег, которого нет в списке (новый контроллер), не теряем — добавляем в конец
            openApi.getPaths().values().forEach(item -> item.readOperations().forEach(operation -> {
                if (operation.getTags() != null) {
                    operation.getTags().forEach(name -> {
                        if (known.add(name)) {
                            tags.add(new Tag().name(name));
                        }
                    });
                }
            }));
            openApi.setTags(tags);
        };
    }
}
