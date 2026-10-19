package ru.sportikus.notification.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.sportikus.notification.model.Notification;

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

    @Modifying
    @Query("update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    void markAllAsRead(@Param("userId") Long userId);

    @Modifying
    @Query("update Notification n set n.read = true where n.id = :id and n.user.id = :userId")
    int markAsRead(@Param("id") Long id, @Param("userId") Long userId);
}
