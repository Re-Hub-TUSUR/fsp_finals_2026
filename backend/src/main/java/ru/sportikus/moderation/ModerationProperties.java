package ru.sportikus.moderation;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/** Настройки автопроверки мероприятий (application.yml → moderation.*). */
@Component
@ConfigurationProperties(prefix = "moderation")
@Getter
@Setter
public class ModerationProperties {

    /** Выключатель всей автопроверки: false — мероприятия публикуются сразу, как раньше. */
    private boolean enabled = true;
    /** Отправлять ИИ мероприятия с пользовательским видом спорта: словарь не оценит тематику «Пивной пинг-понг». */
    private boolean reviewCustomSports = true;
    /** Виды спорта (slug), мероприятия которых всегда проверяет ИИ — по умолчанию «Другое». */
    private List<String> reviewSportSlugs = List.of("drugoe");
    /** Проверки, зависшие дольше этого (например, после перезапуска), доделывает фоновая задача. */
    private Duration stuckAfter = Duration.ofMinutes(1);

    private Llm llm = new Llm();

    @Getter
    @Setter
    public static class Llm {
        private boolean enabled = true;
        /** OpenAI-совместимый шлюз RouterAI. */
        private String baseUrl = "https://routerai.ru/api/v1";
        /** Ключ RouterAI (ROUTERAI_API_KEY). Пусто — второй этап пропускается, сомнительное помечается для администратора. */
        private String apiKey = "";
        /** Быстрая и недорогая модель без «размышлений», хорошо понимает русский. */
        private String model = "yandex/aliceai-llm-flash";
        /** Пользователь ждёт ответа при создании мероприятия — проверка не дольше нескольких секунд. */
        private Duration timeout = Duration.ofSeconds(8);
        private int maxTokens = 200;
        /** Сколько текста мероприятия отправлять модели. */
        private int maxInputChars = 4000;

        public boolean isConfigured() {
            return enabled && apiKey != null && !apiKey.isBlank();
        }
    }
}
