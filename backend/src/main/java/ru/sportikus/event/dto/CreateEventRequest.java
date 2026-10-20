package ru.sportikus.event.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.OrgDetails;
import ru.sportikus.event.model.RecurrenceRule;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.form.CustomField;
import ru.sportikus.form.FieldDef;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Запрос на создание мероприятия. Общая часть одинакова для всех; специфика формата приходит
 * в {@code details} (по полям выбранного шаблона) и {@code customFields} (свои поля автора).
 */
public record CreateEventRequest(
        @NotBlank @Size(max = 150) String title,
        @Size(max = 5000) String description,

        /** Либо id существующего вида спорта, либо название нового. */
        Long sportId,
        @Size(max = 60) String customSportName,

        /** Шаблон конструктора; null — полностью свободный формат. */
        Long templateId,

        @NotNull Instant startTime,
        @NotNull Instant endTime,
        RecurrenceRule recurrenceRule,
        @Min(1) @Max(365) Integer recurrenceIntervalDays,

        @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
        @NotBlank @Size(max = 300) String address,

        @NotNull @Min(1) @Max(1000) Integer capacity,
        JoinMode joinMode,
        SkillLevel skillLevel,
        @Size(max = 500) String requiredEquipment,

        @DecimalMin("0") @DecimalMax("1000000") BigDecimal price,
        Instant registrationDeadline,
        @Min(0) @Max(120) Integer minAge,
        @Min(0) @Max(120) Integer maxAge,

        Map<String, Object> details,
        @Size(max = 10) List<@Valid CustomField> customFields,

        /** Вопросы участнику; если не заданы — берутся из шаблона. */
        List<FieldDef> registrationFields,

        /** Сведения организации; допустимы только для мероприятий от имени организации. */
        @Valid OrgDetails orgDetails
) {
}
