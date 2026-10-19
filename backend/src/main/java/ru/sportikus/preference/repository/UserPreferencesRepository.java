package ru.sportikus.preference.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.sportikus.preference.model.UserPreferences;

import java.util.Optional;

public interface UserPreferencesRepository extends JpaRepository<UserPreferences, Long> {

    @EntityGraph(attributePaths = "homeCity")
    Optional<UserPreferences> findWithCityByUserId(Long userId);
}
