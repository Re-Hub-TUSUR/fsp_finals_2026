package ru.sportikus.comment.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.sportikus.comment.model.Comment;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @EntityGraph(attributePaths = {"user", "event"})
    List<Comment> findByEventIdOrderByCreatedAtAsc(Long eventId);

    @EntityGraph(attributePaths = {"user", "event"})
    List<Comment> findAllByOrderByCreatedAtDesc();
}
