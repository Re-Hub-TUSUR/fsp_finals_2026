package ru.sportikus.event.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.OrgDetails;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.form.CustomField;
import ru.sportikus.form.FieldDef;
import ru.sportikus.participation.dto.ParticipationBrief;
import ru.sportikus.sport.dto.SportDto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Один DTO для списка и карточки: тяжёлые поля (details, orgDetails, вопросы) заполняются
 * только в карточке, в списках они отсутствуют и не попадают в JSON.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EventResponse(
        Long id,
        String title,
        String description,
        SportDto sport,
        TemplateRef template,

        String organizerName,
        String organizerAvatar,
        boolean byOrganization,
        Long organizationId,

        Instant startTime,
        Instant endTime,
        Double lat,
        Double lng,
        String address,

        int capacity,
        int confirmedCount,
        JoinMode joinMode,
        SkillLevel skillLevel,
        BigDecimal price,
        Instant registrationDeadline,
        Integer minAge,
        Integer maxAge,
        String requiredEquipment,

        EventStatus status,
        String unpublishReason,

        // --- только в карточке мероприятия ---
        List<FieldDef> fields,
        Map<String, Object> details,
        List<CustomField> customFields,
        List<FieldDef> registrationFields,
        OrgDetails orgDetails,

        // --- контекст текущего пользователя ---
        ParticipationBrief myParticipation,
        Boolean canManage,
        Integer pendingCount
) {

    public record TemplateRef(Long id, String code, String name, String icon) {
    }
}
