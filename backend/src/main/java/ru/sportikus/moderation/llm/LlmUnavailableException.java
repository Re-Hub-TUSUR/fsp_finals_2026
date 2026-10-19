package ru.sportikus.moderation.llm;

/** ИИ не дал решения: нет ключа, таймаут, ошибка шлюза или непонятный ответ. */
public class LlmUnavailableException extends RuntimeException {

    public LlmUnavailableException(String message) {
        super(message);
    }

    public LlmUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
