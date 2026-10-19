package ru.sportikus.event.cache;

import ru.sportikus.event.dto.EventResponse;

import java.util.List;
import java.util.Optional;

/**
 * Кэш списков мероприятий для карты — только данные, не зависящие от просматривающего пользователя.
 *
 * <p>Версию читают до запроса в БД и передают в {@link #get} и {@link #put}: если данные изменились
 * (версия выросла) пока шёл запрос, устаревший результат не попадёт под новую версию.
 * Любая ошибка хранилища — это промах кэша, а не ошибка запроса.
 */
public interface MapCache {

    /** Текущая версия данных; отрицательная — кэш недоступен. */
    long version();

    Optional<List<EventResponse>> get(long version, String key);

    void put(long version, String key, List<EventResponse> value);

    /** Данные карты изменились: все записи прежней версии перестают читаться. */
    void invalidate();
}
