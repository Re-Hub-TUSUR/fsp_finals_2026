package ru.sportikus.preference;

/** Пользователь изменил интересы или предпочтения — закэшированные рекомендации устарели. */
public record PreferencesChangedEvent(Long userId) {
}
