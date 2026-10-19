package ru.sportikus.comment.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.sportikus.comment.dto.CommentDto;
import ru.sportikus.comment.dto.CreateCommentRequest;
import ru.sportikus.comment.service.CommentService;
import ru.sportikus.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Comments", description = "Обсуждение под мероприятием: вопросы участников, ответы организатора со значком, модерация сообщений")
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/events/{eventId}/comments")
    @Operation(summary = "Сообщения обсуждения мероприятия",
            description = "Публичный, от старых к новым. У сообщений автора-организатора `organizer = true` (значок «Организатор»). "
                    + "Скрытое сообщение отдаётся с текстом «Сообщение скрыто модератором»; настоящий текст видит только администратор.")
    public List<CommentDto> list(@PathVariable Long eventId) {
        return commentService.listByEvent(eventId, CurrentUser.get());
    }

    @PostMapping("/events/{eventId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Отправить сообщение или задать вопрос",
            description = "Нужен вход. Текст — от 1 до 2000 символов. Если автор — организатор мероприятия (автор события или владелец организации), "
                    + "сообщение помечается как организаторское.")
    public CommentDto create(@PathVariable Long eventId, @Valid @RequestBody CreateCommentRequest req) {
        return commentService.create(eventId, req, CurrentUser.require());
    }

    @PatchMapping("/events/{eventId}/comments/{commentId}/hide")
    @Operation(summary = "Скрыть сообщение",
            description = "Может администратор, автор сообщения или организатор мероприятия (иначе `403`). "
                    + "Скрытие мягкое: запись остаётся в базе, обычные пользователи видят заглушку.")
    public CommentDto hide(@PathVariable Long eventId, @PathVariable Long commentId) {
        return commentService.hide(eventId, commentId, CurrentUser.require());
    }

    @GetMapping("/admin/comments")
    @Operation(summary = "Все комментарии платформы (модерация)",
            description = "Только `ROLE_ADMIN`. Новые сверху, включая скрытые, с настоящим текстом и названием мероприятия.")
    public List<CommentDto> adminList() {
        CurrentUser.require(); // Checked by security config as ROLE_ADMIN
        return commentService.listAllForAdmin();
    }
}
