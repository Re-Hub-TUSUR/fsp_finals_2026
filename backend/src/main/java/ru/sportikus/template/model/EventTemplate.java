package ru.sportikus.template.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.form.FieldDef;

import java.util.ArrayList;
import java.util.List;

/** Шаблон конструктора: набор полей и значений по умолчанию для определённого формата мероприятия. */
@Entity
@Table(name = "event_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    private String icon;

    /** ANY — доступен всем, ORGANIZATION — только одобренным организациям. */
    @Column(nullable = false)
    @Builder.Default
    private String audience = "ANY";

    @Column(name = "suggested_sport_slug")
    private String suggestedSportSlug;

    @Column(name = "default_capacity", nullable = false)
    @Builder.Default
    private Integer defaultCapacity = 10;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_join_mode", nullable = false)
    @Builder.Default
    private JoinMode defaultJoinMode = JoinMode.APPROVAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_skill_level", nullable = false)
    @Builder.Default
    private SkillLevel defaultSkillLevel = SkillLevel.ANY;

    @Column(name = "default_duration_minutes", nullable = false)
    @Builder.Default
    private Integer defaultDurationMinutes = 120;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<FieldDef> fields = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "registration_fields", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<FieldDef> registrationFields = new ArrayList<>();

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 100;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    public boolean isOrganizationOnly() {
        return "ORGANIZATION".equals(audience);
    }
}
