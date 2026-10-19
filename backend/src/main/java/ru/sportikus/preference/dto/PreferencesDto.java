package ru.sportikus.preference.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import ru.sportikus.city.dto.CityDto;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.preference.model.PreferredTime;
import ru.sportikus.sport.dto.SportDto;

import java.math.BigDecimal;
import java.util.List;

/** Интересы и предпочтения пользователя — то, на чём строятся рекомендации. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PreferencesDto(
        List<SportDto> sports,
        SkillLevel skillLevel,
        CityDto homeCity,
        Double homeLat,
        Double homeLng,
        int maxDistanceKm,
        List<PreferredTime> preferredTimes,
        BigDecimal maxPrice,
        Integer birthYear,
        /** Указал ли пользователь хоть что-то (интересы или город). */
        boolean configured
) {
}
