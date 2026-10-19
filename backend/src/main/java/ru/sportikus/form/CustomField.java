package ru.sportikus.form;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Произвольная пара «название — значение», которую автор добавляет к мероприятию сам. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CustomField(
        @NotBlank @Size(max = 80) String label,
        @NotBlank @Size(max = 500) String value
) {
}
