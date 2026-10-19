package ru.sportikus.moderation.llm;

import ru.sportikus.moderation.ModerationHit;

import java.util.List;

/** Второй этап автопроверки: решение языковой модели. Реализацию можно заменить без правок остального кода. */
public interface LlmModerationClient {

    /**
     * @param eventText текст мероприятия «Поле: значение»
     * @param hits      что нашёл фильтр (подсказка модели, почему мероприятие сомнительное)
     * @throws LlmUnavailableException если решение получить не удалось
     */
    LlmVerdict review(String eventText, List<ModerationHit> hits);
}
