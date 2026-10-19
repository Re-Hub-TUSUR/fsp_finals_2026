package ru.sportikus.city.model;

import jakarta.persistence.*;
import lombok.*;

/** Город: геокорзина для «популярного рядом», источник часового пояса события и домашний город пользователя. */
@Entity
@Table(name = "cities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class City {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String region;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    @Column(name = "time_zone", nullable = false)
    private String timeZone;

    private Integer population;
}
