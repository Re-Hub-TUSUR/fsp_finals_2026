package ru.sportikus.comment.dto;

import ru.sportikus.comment.model.Comment;

import java.time.Instant;

public record CommentDto(
        Long id,
        Long eventId,
        String eventTitle,
        Long authorId,
        String authorName,
        String authorRole,
        String authorAvatarUrl,
        String text,
        boolean organizer,
        boolean hidden,
        Instant createdAt
) {
    public static CommentDto from(Comment c, boolean isAdmin) {
        String displayText = Boolean.TRUE.equals(c.getIsHidden()) && !isAdmin
                ? "Сообщение скрыто модератором"
                : c.getText();

        return new CommentDto(
                c.getId(),
                c.getEvent().getId(),
                c.getEvent().getTitle(),
                c.getUser().getId(),
                c.getUser().getFullName(),
                c.getUser().getRole(),
                c.getUser().getAvatarUrl(),
                displayText,
                Boolean.TRUE.equals(c.getIsOrganizer()),
                Boolean.TRUE.equals(c.getIsHidden()),
                c.getCreatedAt()
        );
    }
}
