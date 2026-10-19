package ru.sportikus.organization.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.sportikus.organization.model.Organization;

import java.util.List;
import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findFirstByOwnerIdOrderByIdAsc(Long ownerId);

    boolean existsByInn(String inn);

    boolean existsByOgrn(String ogrn);

    @EntityGraph(attributePaths = "owner")
    List<Organization> findByStatusOrderByCreatedAtDesc(String status);

    @EntityGraph(attributePaths = "owner")
    List<Organization> findAllByOrderByCreatedAtDesc();
}
