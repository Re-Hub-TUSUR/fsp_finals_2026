package ru.sportikus.participation.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ParticipationRepository extends JpaRepository<Participation, Long> {

    /** Количество заявок по событиям и статусам (для счётчиков мест и «ожидают решения»). */
    interface StatusCount {
        Long getEventId();

        ParticipationStatus getStatus();

        Long getCnt();
    }

    @Query("""
            select p.event.id as eventId, p.status as status, count(p) as cnt
            from Participation p
            where p.event.id in :eventIds and p.status in (ru.sportikus.participation.model.ParticipationStatus.CONFIRMED,
                                                           ru.sportikus.participation.model.ParticipationStatus.PENDING)
            group by p.event.id, p.status
            """)
    List<StatusCount> countByEvents(@Param("eventIds") Collection<Long> eventIds);

    long countByEventIdAndStatus(Long eventId, ParticipationStatus status);

    Optional<Participation> findByEventIdAndUserId(Long eventId, Long userId);

    List<Participation> findByUserIdAndEventIdIn(Long userId, Collection<Long> eventIds);

    @EntityGraph(attributePaths = "user")
    List<Participation> findByEventIdOrderByCreatedAtAsc(Long eventId);

    @EntityGraph(attributePaths = {"event", "event.sport", "event.organizerUser", "event.organizerOrg", "event.template"})
    List<Participation> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"user", "event"})
    Optional<Participation> findWithUserById(Long id);
}
