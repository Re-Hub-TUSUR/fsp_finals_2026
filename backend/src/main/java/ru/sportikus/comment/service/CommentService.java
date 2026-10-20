package ru.sportikus.comment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.comment.dto.CommentDto;
import ru.sportikus.comment.dto.CreateCommentRequest;
import ru.sportikus.comment.model.Comment;
import ru.sportikus.comment.repository.CommentRepository;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventAccess;
import ru.sportikus.security.AuthUser;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CommentDto> listByEvent(Long eventId, Optional<AuthUser> viewer) {
        boolean isAdmin = viewer.map(AuthUser::isAdmin).orElse(false);
        return commentRepository.findByEventIdOrderByCreatedAtAsc(eventId).stream()
                .map(c -> CommentDto.from(c, isAdmin))
                .toList();
    }

    @Transactional
    public CommentDto create(Long eventId, CreateCommentRequest req, AuthUser currentUser) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> ApiException.notFound("Мероприятие не найдено"));

        User user = userRepository.require(currentUser.id());

        Comment comment = Comment.builder()
                .event(event)
                .user(user)
                .text(req.text().trim())
                .isOrganizer(EventAccess.isManager(event, user.getId()))
                .isHidden(false)
                .build();

        Comment saved = commentRepository.save(comment);
        return CommentDto.from(saved, currentUser.isAdmin());
    }

    @Transactional
    public CommentDto hide(Long eventId, Long commentId, AuthUser currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Комментарий не найден"));

        if (!comment.getEvent().getId().equals(eventId)) {
            throw ApiException.badRequest("Комментарий не относится к указанному мероприятию");
        }

        boolean canHide = currentUser.isAdmin()
                || comment.getUser().getId().equals(currentUser.id())
                || EventAccess.isManager(comment.getEvent(), currentUser.id());

        if (!canHide) {
            throw ApiException.forbidden("Недостаточно прав для модерации этого комментария");
        }

        comment.setIsHidden(true);
        Comment saved = commentRepository.save(comment);
        return CommentDto.from(saved, currentUser.isAdmin());
    }

    @Transactional(readOnly = true)
    public List<CommentDto> listAllForAdmin() {
        return commentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(c -> CommentDto.from(c, true))
                .toList();
    }
}
