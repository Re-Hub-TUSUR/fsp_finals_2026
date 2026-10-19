package ru.sportikus.sport.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.sportikus.sport.model.Sport;

import java.util.List;
import java.util.Optional;

public interface SportRepository extends JpaRepository<Sport, Long> {

    Optional<Sport> findBySlug(String slug);

    List<Sport> findAllByOrderByNameAsc();
}
