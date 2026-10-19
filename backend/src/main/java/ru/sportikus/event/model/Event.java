package ru.sportikus.event.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.sportikus.city.model.City;
import ru.sportikus.form.CustomField;
import ru.sportikus.form.FieldDef;
import ru.sportikus.moderation.ModerationHit;
import ru.sportikus.moderation.ModerationStatus;
import ru.sportikus.organization.model.Organization;
import ru.sportikus.sport.model.Sport;
import ru.sportikus.template.model.EventTemplate;
import ru.sportikus.user.model.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sport_id", nullable = false)
    private Sport sport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private EventTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_user_id")
    private User organizerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_org_id")
    private Organization organizerOrg;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    @Column(nullable = false)
    private String address;

    /** Ближайший город — геокорзина для «популярного рядом». */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id")
    private City city;

    /** Часовой пояс места проведения (IANA), в нём показывается и интерпретируется время. */
    @Column(name = "time_zone")
    private String timeZone;

    @Column(nullable = false)
    @Builder.Default
    private Integer capacity = 10;

    @Enumerated(EnumType.STRING)
    @Column(name = "join_mode", nullable = false)
    @Builder.Default
    private JoinMode joinMode = JoinMode.APPROVAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "skill_level", nullable = false)
    @Builder.Default
    private SkillLevel skillLevel = SkillLevel.ANY;

    @Column(name = "required_equipment", columnDefinition = "TEXT")
    private String requiredEquipment;

    /** Стоимость участия; null — бесплатно. */
    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "registration_deadline")
    private Instant registrationDeadline;

    @Column(name = "min_age")
    private Integer minAge;

    @Column(name = "max_age")
    private Integer maxAge;

    /** Снимок описаний полей шаблона на момент создания — мероприятие остаётся самодостаточным. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<FieldDef> fields = new ArrayList<>();

    /** Значения полей шаблона: key → value. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> details = new LinkedHashMap<>();

    /** Поля, добавленные автором вручную. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "custom_fields", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<CustomField> customFields = new ArrayList<>();

    /** Вопросы, на которые отвечает участник при подаче заявки. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "registration_fields", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<FieldDef> registrationFields = new ArrayList<>();

    /** Дополнительные сведения организации; null у мероприятий частных лиц. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "org_details", columnDefinition = "jsonb")
    private OrgDetails orgDetails;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EventStatus status = EventStatus.PUBLISHED;

    @Column(name = "unpublish_reason", columnDefinition = "TEXT")
    private String unpublishReason;

    /** Результат автопроверки (фильтр слов → ИИ); FLAGGED — повод администратору присмотреться. */
    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false)
    @Builder.Default
    private ModerationStatus moderationStatus = ModerationStatus.CLEAN;

    @Column(name = "moderation_reason", columnDefinition = "TEXT")
    private String moderationReason;

    /** Что нашёл фильтр запрещённых слов. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "moderation_hits", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<ModerationHit> moderationHits = new ArrayList<>();

    /** Модель ИИ, принявшая решение (null — до ИИ дело не дошло). */
    @Column(name = "moderation_model")
    private String moderationModel;

    @Column(name = "moderated_at")
    private Instant moderatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public boolean isByOrganization() {
        return organizerOrg != null;
    }

    /** Последний момент, когда можно подать заявку. */
    public Instant registrationClosesAt() {
        return registrationDeadline != null ? registrationDeadline : startTime;
    }

    /** Нужно ли участнику подтвердить ознакомление с требованиями (документы, справка, страховка). */
    public boolean requiresAcknowledgement() {
        return orgDetails != null && orgDetails.hasParticipationRequirements();
    }
}
