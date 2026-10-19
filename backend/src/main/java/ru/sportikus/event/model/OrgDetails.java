package ru.sportikus.event.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Дополнительные сведения, которые обязательно или желательно указывать организациям:
 * контакты, документы, регламент, программа, инфраструктура, условия отмены.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrgDetails(
        @Size(max = 100) String contactName,
        @Size(max = 40) String contactPhone,
        @Size(max = 120) String contactEmail,
        @Size(max = 300) String website,
        @Size(max = 200) String venueName,
        @Size(max = 10) List<@Size(max = 200) String> requiredDocuments,
        Boolean medicalCertificateRequired,
        Boolean insuranceRequired,
        @Size(max = 500) String prizes,
        @Size(max = 20) List<@Valid ProgramItem> program,
        @Size(max = 15) List<@Size(max = 100) String> facilities,
        @Size(max = 1000) String cancellationPolicy,
        @Size(max = 300) String sponsors
) {

    /** Нужно ли участнику подтвердить, что он ознакомлен с требованиями, прежде чем подавать заявку. */
    public boolean hasParticipationRequirements() {
        return Boolean.TRUE.equals(medicalCertificateRequired)
                || Boolean.TRUE.equals(insuranceRequired)
                || (requiredDocuments != null && !requiredDocuments.isEmpty());
    }
}
