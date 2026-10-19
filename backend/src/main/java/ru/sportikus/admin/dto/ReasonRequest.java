package ru.sportikus.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Причина отказа или снятия с публикации — обязательна, её увидит автор. */
public record ReasonRequest(@NotBlank @Size(max = 500) String reason) {
}
