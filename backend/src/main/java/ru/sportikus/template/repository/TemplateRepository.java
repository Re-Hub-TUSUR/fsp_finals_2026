package ru.sportikus.template.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.sportikus.template.model.EventTemplate;

import java.util.List;
import java.util.Optional;

public interface TemplateRepository extends JpaRepository<EventTemplate, Long> {

    List<EventTemplate> findByActiveTrueOrderBySortOrderAscIdAsc();

    Optional<EventTemplate> findByIdAndActiveTrue(Long id);
}
