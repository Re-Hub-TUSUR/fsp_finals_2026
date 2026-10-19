package ru.sportikus.template.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.form.FieldDef;
import ru.sportikus.template.model.EventTemplate;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TemplateDto(
        Long id,
        String code,
        String name,
        String description,
        String icon,
        boolean organizationOnly,
        String suggestedSportSlug,
        int defaultCapacity,
        JoinMode defaultJoinMode,
        SkillLevel defaultSkillLevel,
        int defaultDurationMinutes,
        List<FieldDef> fields,
        List<FieldDef> registrationFields
) {

    public static TemplateDto from(EventTemplate t) {
        return new TemplateDto(t.getId(), t.getCode(), t.getName(), t.getDescription(), t.getIcon(),
                t.isOrganizationOnly(), t.getSuggestedSportSlug(), t.getDefaultCapacity(),
                t.getDefaultJoinMode(), t.getDefaultSkillLevel(), t.getDefaultDurationMinutes(),
                t.getFields(), t.getRegistrationFields());
    }
}
