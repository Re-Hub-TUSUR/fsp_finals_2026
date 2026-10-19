package ru.sportikus.subscription.dto;

import java.time.Instant;

public record OrganizationSubscriptionResponse(
        Long organizationId,
        String name,
        String imageUrl,
        long subscriberCount,
        Instant subscribedAt
) {
}
