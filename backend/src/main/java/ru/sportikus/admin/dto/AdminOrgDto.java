package ru.sportikus.admin.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import ru.sportikus.organization.model.Organization;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminOrgDto(
        Long id,
        String name,
        String description,
        String status,
        String rejectReason,
        String logoUrl,
        String ownerName,
        String ownerEmail
) {

    public static AdminOrgDto from(Organization o) {
        return new AdminOrgDto(o.getId(), o.getName(), o.getDescription(), o.getStatus(), o.getRejectReason(),
                o.getLogoUrl(), o.getOwner().getFullName(), o.getOwner().getEmail());
    }
}
