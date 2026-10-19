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
@Tag(name = "Comments", description = "Обсуждения и чат мероприятия (Сценарий 5 ТЗ)")
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/events/{eventId}/comments")
    @Operation(summary = "Получить сообщения и вопросы в обсуждении мероприятия")
    public List<CommentDto> list(@PathVariable Long eventId) {
        return commentService.listByEvent(eventId, CurrentUser.get());
    }

    @PostMapping("/events/{eventId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Отправить сообщение / задать вопрос в обсуждении")
    public CommentDto create(@PathVariable Long eventId, @Valid @RequestBody CreateCommentRequest req) {
        return commentService.create(eventId, req, CurrentUser.require());
    }

    @PatchMapping("/events/{eventId}/comments/{commentId}/hide")
    @Operation(summary = "Скрыть сообщение модератором или автором")
    public CommentDto hide(@PathVariable Long eventId, @PathVariable Long commentId) {
        return commentService.hide(eventId, commentId, CurrentUser.require());
    }

    @GetMapping("/admin/comments")
    @Operation(summary = "Все комментарии платформы для панели администратора")
    public List<CommentDto> adminList() {
        CurrentUser.require(); // Checked by security config as ROLE_ADMIN
        return commentService.listAllForAdmin();
    }
}
