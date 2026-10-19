package ru.sportikus.event.model;

public enum EventStatus {
    PUBLISHED,
    UNPUBLISHED,
    CANCELLED,
    /** Идёт автоматическая проверка (несколько секунд): мероприятие пока скрыто из каталога. */
    MODERATION
}
