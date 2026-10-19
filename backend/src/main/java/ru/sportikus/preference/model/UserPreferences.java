package ru.sportikus.preference.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.sportikus.city.model.City;
import ru.sportikus.event.model.SkillLevel;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Явные предпочтения пользователя: заполняются при регистрации и в профиле. */
@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferences {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "skill_level")
    private SkillLevel skillLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_city_id")
    private City homeCity;

    /** Точная домашняя точка (необязательно); если нет — используется центр домашнего города. */
    @Column(name = "home_lat")
    private Double homeLat;

    @Column(name = "home_lng")
    private Double homeLng;

    @Column(name = "max_distance_km", nullable = false)
    @Builder.Default
    private Integer maxDistanceKm = 25;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferred_times", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<PreferredTime> preferredTimes = new ArrayList<>();

    @Column(name = "max_price", precision = 10, scale = 2)
    private BigDecimal maxPrice;

    @Column(name = "birth_year")
    private Integer birthYear;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    @PrePersist
    void touch() {
        this.updatedAt = Instant.now();
    }
}
