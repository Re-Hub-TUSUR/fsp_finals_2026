package ru.sportikus.subscription.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.organization.model.Organization;
import ru.sportikus.organization.repository.OrganizationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.subscription.dto.OrganizationSubscriptionResponse;
import ru.sportikus.subscription.model.OrganizationSubscription;
import ru.sportikus.subscription.repository.OrganizationSubscriptionRepository;
import ru.sportikus.subscription.repository.OrganizationSubscriptionRepository.SubscriberCount;
import ru.sportikus.user.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizationSubscriptionService {
    private final OrganizationSubscriptionRepository repository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void subscribe(AuthUser auth, Long organizationId) {
        rejectNonUser(auth);
        Organization organization = approved(organizationId);
        if (organization.getOwner().getId().equals(auth.id())) {
            throw ApiException.badRequest("Нельзя подписаться на собственную организацию");
        }
        var id = new OrganizationSubscription.Id(auth.id(), organizationId);
        if (repository.existsById(id)) return;
        repository.save(OrganizationSubscription.builder()
                .id(id)
                .user(userRepository.getReferenceById(auth.id()))
                .organization(organization)
                .build());
    }

    @Transactional
    public void unsubscribe(AuthUser auth, Long organizationId) {
        rejectNonUser(auth);
        repository.deleteByUserIdAndOrganizationId(auth.id(), organizationId);
    }

    @Transactional(readOnly = true)
    public List<OrganizationSubscriptionResponse> mine(AuthUser auth) {
        rejectNonUser(auth);
        List<OrganizationSubscription> items = repository.findByUserIdOrderByCreatedAtDesc(auth.id()).stream()
                .filter(item -> "APPROVED".equals(item.getOrganization().getStatus()))
                .toList();
        if (items.isEmpty()) return List.of();
        // Счётчики подписчиков всех организаций — одним сгруппированным запросом
        Map<Long, Long> counts = repository.countByOrganizations(
                        items.stream().map(item -> item.getOrganization().getId()).toList()).stream()
                .collect(Collectors.toMap(SubscriberCount::getOrganizationId, SubscriberCount::getCnt));
        return items.stream()
                .map(item -> new OrganizationSubscriptionResponse(
                        item.getOrganization().getId(), item.getOrganization().getName(), item.getOrganization().getLogoUrl(),
                        counts.getOrDefault(item.getOrganization().getId(), 0L), item.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public long count(Long organizationId) {
        return repository.countByOrganizationId(organizationId);
    }

    @Transactional(readOnly = true)
    public boolean subscribed(Long userId, Long organizationId) {
        return userId != null && repository.existsByUserIdAndOrganizationId(userId, organizationId);
    }

    private Organization approved(Long id) {
        return organizationRepository.findById(id)
                .filter(org -> "APPROVED".equals(org.getStatus()))
                .orElseThrow(() -> ApiException.notFound("Организация не найдена"));
    }

    private static void rejectNonUser(AuthUser auth) {
        if (auth.isAdmin()) throw ApiException.forbidden("Администратор не может подписываться на организации");
        if (auth.isOrganizer()) throw ApiException.forbidden("Подписываться на организации могут только пользователи");
    }
}
