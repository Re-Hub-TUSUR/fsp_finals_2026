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

import java.util.List;
import java.util.Set;

@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    /** Эндпоинты, доступные без токена (должны совпадать с правилами в {@link SecurityConfig}). */
    private static final Set<String> PUBLIC_GET = Set.of(
            "/api/v1/sports", "/api/v1/templates", "/api/v1/cities", "/api/v1/cities/nearest",
            "/api/v1/events", "/api/v1/events/{id}", "/api/v1/events/{id}/ics", "/api/v1/events/{eventId}/comments",
            "/api/v1/profiles/users/{id}", "/api/v1/profiles/organizations/{id}");
    private static final Set<String> PUBLIC_POST = Set.of(
            "/api/v1/auth/login", "/api/v1/auth/register/user", "/api/v1/auth/register/organization");

    private static final String DESCRIPTION = """
            REST API платформы спортивных активностей **Sportikus** — «от желания потренироваться к конкретной компании за 2 клика».
            Финал Чемпионата России по продуктовому программированию (ФСП, кейс Столото).

            ### Как авторизоваться в Swagger
            1. Выполните `POST /api/v1/auth/login` (например, `user@sport.ru` / `password123`) или зарегистрируйтесь через `/auth/register/*`.
            2. Скопируйте `token` из ответа, нажмите **Authorize** и вставьте его (префикс `Bearer` добавляется автоматически).
            3. Замок у операции означает, что нужен токен; операции без замка публичны (каталог, карточка события, справочники, профили, чтение обсуждения).

            ### Демо-аккаунты (пароль у всех `password123`)
            | Роль | E-mail |
            |---|---|
            | Пользователь | `user@sport.ru`, `olga@sport.ru`, `pro@sport.ru`, `masha@sport.ru` (Москва) |
            | Организация (одобрена) | `enisey@sport.ru` |
            | Организация (на модерации) | `ladya@sport.ru` |
            | Администратор | `admin@sport.ru` |

            ### Роли и доступ
            * **ROLE_USER** — создаёт мероприятия от своего имени, записывается, подаёт заявки, получает рекомендации, пишет в обсуждения.
            * **ROLE_ORGANIZER** — публикует мероприятия от имени организации, **только после одобрения** администратором (иначе `403`); отвечает в обсуждениях со значком «Организатор».
            * **ROLE_ADMIN** — модерация организаций, мероприятий и комментариев (`/api/v1/admin/**`); сам не создаёт мероприятия и не участвует.

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
            """;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Sportikus Platform API")
                        .version("1.0.0")
                        .description(DESCRIPTION)
                        .contact(new Contact()
                                .name("Sportikus Team")
                                .url("https://github.com/Re-Hub-TUSUR/fsp_finals_2026")))
                .tags(List.of(
                        new Tag().name("Auth").description("Вход, регистрация пользователей и организаций, текущий профиль"),
                        new Tag().name("Profiles").description("Публичные профили пользователей и организаций, редактирование, загрузка фото и логотипа"),
                        new Tag().name("Events").description("Каталог и создание мероприятий (от пользователя и от организации), экспорт в календарь"),
                        new Tag().name("Participation").description("Запись на мероприятия и подтверждение участия организатором"),
                        new Tag().name("Comments").description("Обсуждение под мероприятием: вопросы участников, ответы организатора со значком, модерация сообщений"),
                        new Tag().name("Me").description("Личный кабинет: мои заявки и мои мероприятия"),
                        new Tag().name("Preferences").description("Интересы и предпочтения пользователя — основа рекомендаций"),
                        new Tag().name("Recommendations").description("Персональные рекомендации с объяснением причин и обратной связью"),
                        new Tag().name("Templates").description("Конструктор мероприятий: шаблоны с настраиваемыми полями"),
                        new Tag().name("Sports").description("Справочник видов спорта и активностей (включая добавленные пользователями)"),
                        new Tag().name("Cities").description("Справочник городов и часовых поясов"),
                        new Tag().name("Admin").description("Модерация организаций, мероприятий и комментариев (только ROLE_ADMIN)")))
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

    /** Снимает «замок» с публичных операций: глобальное требование токена для них не действует. */
    @Bean
    public OpenApiCustomizer publicEndpointsCustomizer() {
        return openApi -> openApi.getPaths().forEach((path, item) -> {
            if (item.getGet() != null && PUBLIC_GET.contains(path)) {
                item.getGet().setSecurity(List.of());
            }
            if (item.getPost() != null && PUBLIC_POST.contains(path)) {
                item.getPost().setSecurity(List.of());
            }
        });
    }
}
