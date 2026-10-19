package ru.sportikus.subscription.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.sportikus.subscription.model.OrganizationSubscription;

import java.util.List;

public interface OrganizationSubscriptionRepository extends JpaRepository<OrganizationSubscription, OrganizationSubscription.Id> {
    long countByOrganizationId(Long organizationId);
    boolean existsByUserIdAndOrganizationId(Long userId, Long organizationId);
    void deleteByUserIdAndOrganizationId(Long userId, Long organizationId);
    List<OrganizationSubscription> findByUserIdOrderByCreatedAtDesc(Long userId);
}
