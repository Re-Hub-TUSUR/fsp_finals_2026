package ru.sportikus.notification.dto;

import ru.sportikus.notification.model.Notification;
import ru.sportikus.notification.model.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String message,
        String linkUrl,
        Long senderUserId,
        String senderName,
        String senderAvatar,
        Long eventId,
        String eventTitle,
        boolean read,
        Instant createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.getLinkUrl(),
                n.getSenderUser() != null ? n.getSenderUser().getId() : null,
                n.getSenderUser() != null ? n.getSenderUser().getFullName() : null,
                n.getSenderUser() != null ? n.getSenderUser().getAvatarUrl() : null,
                n.getEvent() != null ? n.getEvent().getId() : null,
                n.getEvent() != null ? n.getEvent().getTitle() : null,
                n.isRead(),
                n.getCreatedAt()
        );
    }
}
