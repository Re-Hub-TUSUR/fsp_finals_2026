package ru.sportikus.preference.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.preference.model.PreferredTime;

import java.math.BigDecimal;
import java.util.List;

/**
 * Обновление интересов. Используется формой регистрации и профилем.
 * Все поля необязательны; отсутствующее поле очищает значение (PUT-семантика).
 */
public record UpdatePreferencesRequest(
        @Size(max = 20) List<Long> sportIds,
        SkillLevel skillLevel,
        Long homeCityId,
        @DecimalMin("-90") @DecimalMax("90") Double homeLat,
        @DecimalMin("-180") @DecimalMax("180") Double homeLng,
        @Min(1) @Max(300) Integer maxDistanceKm,
        @Size(max = 4) List<PreferredTime> preferredTimes,
        @DecimalMin("0") @DecimalMax("1000000") BigDecimal maxPrice,
        @Min(1900) @Max(2100) Integer birthYear
) {
}
