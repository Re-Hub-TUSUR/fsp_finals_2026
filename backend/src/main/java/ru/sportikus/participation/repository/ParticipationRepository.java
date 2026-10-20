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
                                                           ru.sportikus.participation.model.ParticipationStatus.PENDING,
                                                           ru.sportikus.participation.model.ParticipationStatus.WAITLISTED)
            group by p.event.id, p.status
            """)
    List<StatusCount> countByEvents(@Param("eventIds") Collection<Long> eventIds);

    long countByEventIdAndStatus(Long eventId, ParticipationStatus status);

    Optional<Participation> findByEventIdAndUserId(Long eventId, Long userId);

    List<Participation> findByUserIdAndEventIdIn(Long userId, Collection<Long> eventIds);

    /** Кто из перечисленных пользователей активно участвует в мероприятии (записан, ждёт решения или в очереди). */
    @Query("""
            select p.user.id from Participation p
            where p.event.id = :eventId and p.user.id in :userIds and p.status in :statuses
            """)
    List<Long> findUserIdsByEventAndStatuses(@Param("eventId") Long eventId, @Param("userIds") Collection<Long> userIds,
                                             @Param("statuses") Collection<ParticipationStatus> statuses);

    interface FriendAttendee {
        Long getEventId();
        Long getUserId();
        String getFullName();
        String getAvatarUrl();
    }

    /** Confirmed participants who are accepted friends of the viewer, fetched for an entire event list. */
    @Query("""
            select p.event.id as eventId, p.user.id as userId, p.user.fullName as fullName, p.user.avatarUrl as avatarUrl
            from Participation p, Friendship f
            where p.event.id in :eventIds
              and p.status = ru.sportikus.participation.model.ParticipationStatus.CONFIRMED
              and f.status = ru.sportikus.friendship.model.FriendshipStatus.ACCEPTED
              and ((f.requester.id = :viewerId and f.recipient.id = p.user.id)
                or (f.recipient.id = :viewerId and f.requester.id = p.user.id))
            order by p.event.id, p.createdAt asc
            """)
    List<FriendAttendee> findConfirmedFriendsByEventIds(@Param("viewerId") Long viewerId,
                                                        @Param("eventIds") Collection<Long> eventIds);

    @EntityGraph(attributePaths = "user")
    List<Participation> findByEventIdOrderByCreatedAtAsc(Long eventId);

    /** Очередь на мероприятие в порядке постановки. */
    @EntityGraph(attributePaths = "user")
    List<Participation> findByEventIdAndStatusOrderByCreatedAtAsc(Long eventId, ParticipationStatus status);

    @EntityGraph(attributePaths = {"event", "event.sport", "event.organizerUser", "event.organizerOrg", "event.template", "event.city"})
    List<Participation> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"user", "event"})
    Optional<Participation> findWithUserById(Long id);

    @EntityGraph(attributePaths = {"user", "event"})
    Optional<Participation> findByTicketCode(String ticketCode);
}
