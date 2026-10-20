package ru.sportikus.stats;

/** Цифры для приветственной страницы: показываются гостям, поэтому только агрегаты без персональных данных. */
public record PublicStatsDto(long upcomingEvents, long athletes, long sports, long organizations) {
}
