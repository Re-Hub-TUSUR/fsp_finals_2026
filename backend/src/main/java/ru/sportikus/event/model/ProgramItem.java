package ru.sportikus.event.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Пункт программы/расписания мероприятия организации. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProgramItem(
        @Size(max = 40) String time,
        @NotBlank @Size(max = 200) String title
) {
}
