package ru.sportikus.form;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Описание одного поля формы. Одна и та же структура используется для полей шаблона мероприятия
 * и для вопросов, которые организатор задаёт участнику при подаче заявки.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FieldDef(
        String key,
        String label,
        FieldType type,
        boolean required,
        List<String> options,
        String unit,
        String placeholder,
        String help
) {
}
