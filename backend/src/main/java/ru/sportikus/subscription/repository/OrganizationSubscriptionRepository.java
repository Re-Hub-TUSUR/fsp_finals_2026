package ru.sportikus.subscription.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.sportikus.subscription.model.OrganizationSubscription;

import java.util.Collection;
import java.util.List;

public interface OrganizationSubscriptionRepository extends JpaRepository<OrganizationSubscription, OrganizationSubscription.Id> {
    interface SubscriberCount {
        Long getOrganizationId();

        Long getCnt();
    }

    long countByOrganizationId(Long organizationId);
    boolean existsByUserIdAndOrganizationId(Long userId, Long organizationId);
    void deleteByUserIdAndOrganizationId(Long userId, Long organizationId);

    /** Подписки вместе с организациями — одним запросом, без ленивой загрузки на каждую строку. */
    @EntityGraph(attributePaths = "organization")
    List<OrganizationSubscription> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("""
            select s.organization.id as organizationId, count(s) as cnt
            from OrganizationSubscription s
            where s.organization.id in :organizationIds
            group by s.organization.id
            """)
    List<SubscriberCount> countByOrganizations(@Param("organizationIds") Collection<Long> organizationIds);
}
