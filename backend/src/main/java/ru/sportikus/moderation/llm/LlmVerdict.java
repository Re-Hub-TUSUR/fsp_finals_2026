package ru.sportikus.moderation.llm;

/** Решение модели по сомнительному мероприятию. */
public record LlmVerdict(Decision decision, String reason, String model) {

    public enum Decision {
        /** По теме платформы (спорт, активность, ЗОЖ) и без нарушений. */
        APPROVE,
        /** Не по теме или нарушает правила. */
        REJECT
    }
}
