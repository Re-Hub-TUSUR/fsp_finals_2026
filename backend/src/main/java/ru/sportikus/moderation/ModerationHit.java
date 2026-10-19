package ru.sportikus.moderation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Срабатывание фильтра: категория, найденный фрагмент и поле мероприятия, где он найден. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ModerationHit(ContentCategory category, String term, String field) {
}
