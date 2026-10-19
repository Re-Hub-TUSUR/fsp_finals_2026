package ru.sportikus.notification.dto;

import java.util.List;

public record NotificationListResponse(
        long unreadCount,
        List<NotificationResponse> items
) {
}
