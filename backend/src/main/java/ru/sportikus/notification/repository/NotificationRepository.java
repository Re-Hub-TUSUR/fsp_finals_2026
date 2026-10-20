package ru.sportikus.notification.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.sportikus.notification.model.Notification;
import ru.sportikus.notification.model.NotificationType;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("""
            select n from Notification n
            left join fetch n.senderUser
            left join fetch n.event
            where n.user.id = :userId
            order by n.createdAt desc
            """)
    List<Notification> findRecentByUserId(@Param("userId") Long userId);

    long countByUserIdAndReadFalse(Long userId);

    /** Кому из перечисленных отправитель уже отправлял уведомление этого типа об этом мероприятии. */
    @Query("""
            select distinct n.user.id from Notification n
            where n.type = :type and n.senderUser.id = :senderId and n.event.id = :eventId and n.user.id in :userIds
            """)
    List<Long> findRecipientIds(@Param("type") NotificationType type, @Param("senderId") Long senderId,
                                @Param("eventId") Long eventId, @Param("userIds") Collection<Long> userIds);

    @Modifying
    @Query("update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    void markAllAsRead(@Param("userId") Long userId);

    @Modifying
    @Query("update Notification n set n.read = true where n.id = :id and n.user.id = :userId")
    int markAsRead(@Param("id") Long id, @Param("userId") Long userId);

    @Modifying
    @Query(value = """
            INSERT INTO notifications
                (user_id, type, title, message, link_url, event_id, is_read, created_at)
            SELECT p.user_id,
                   'EVENT_REMINDER',
                   'Мероприятие уже завтра',
                   concat('До начала «', e.title,
                          '» осталось меньше суток. Проверьте время, адрес и QR-билет.'),
                   concat('/events/', e.id),
                   e.id,
                   FALSE,
                   :now
            FROM participations p
            JOIN events e ON e.id = p.event_id
            WHERE p.status = 'CONFIRMED'
              AND e.status = 'PUBLISHED'
              AND e.start_time > :now
              AND e.start_time <= :deadline
            ON CONFLICT (user_id, event_id, type)
                WHERE type = 'EVENT_REMINDER'
            DO NOTHING
            """, nativeQuery = true)
    int insertDueEventReminders(@Param("now") Instant now, @Param("deadline") Instant deadline);
}
