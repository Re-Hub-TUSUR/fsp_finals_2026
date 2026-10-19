package ru.sportikus.city.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.sportikus.city.model.City;

import java.util.List;
import java.util.Optional;

public interface CityRepository extends JpaRepository<City, Long> {

    List<City> findAllByOrderByPopulationDescNameAsc();

    /** Ближайший город к точке (KNN по GiST-индексу PostGIS). */
    @Query(value = """
            SELECT * FROM cities
            ORDER BY geog <-> geography(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
            LIMIT 1
            """, nativeQuery = true)
    Optional<City> findNearest(@Param("lat") double lat, @Param("lng") double lng);
}
