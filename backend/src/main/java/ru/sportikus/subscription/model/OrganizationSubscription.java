package ru.sportikus.subscription.model;

import jakarta.persistence.*;
import lombok.*;
import ru.sportikus.organization.model.Organization;
import ru.sportikus.user.model.User;

import java.time.Instant;

@Entity
@Table(name = "organization_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationSubscription {
    @EmbeddedId
    private Id id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @MapsId("organizationId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Id implements java.io.Serializable {
        private Long userId;
        private Long organizationId;
    }
}
