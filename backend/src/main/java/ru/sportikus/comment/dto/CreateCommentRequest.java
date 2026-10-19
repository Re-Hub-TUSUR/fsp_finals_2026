package ru.sportikus.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCommentRequest(
        @NotBlank(message = "Текст сообщения не может быть пустым")
        @Size(max = 2000, message = "Текст сообщения не должен превышать 2000 символов")
        String text
) {
}
