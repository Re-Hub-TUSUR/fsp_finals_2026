package ru.sportikus.event.model;

import jakarta.persistence.*;
import lombok.*;
import ru.sportikus.organization.model.Organization;
import ru.sportikus.sport.model.Sport;
import ru.sportikus.user.model.User;

import java.time.Instant;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sport_id", nullable = false)
    private Sport sport;

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

    @Column(nullable = false)
    @Builder.Default
    private Integer capacity = 10;

    @Column(name = "join_mode", nullable = false)
    @Builder.Default
    private String joinMode = "OPEN"; // OPEN or APPROVAL

    @Column(name = "skill_level", nullable = false)
    @Builder.Default
    private String skillLevel = "ANY"; // NOVICE, AMATEUR, PRO, ANY

    @Column(name = "required_equipment", columnDefinition = "TEXT")
    private String requiredEquipment;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PUBLISHED"; // PUBLISHED, UNPUBLISHED, CANCELLED

    @Column(name = "unpublish_reason", columnDefinition = "TEXT")
    private String unpublishReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
