package ru.sportikus.friendship.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.sportikus.friendship.model.Friendship;
import ru.sportikus.friendship.model.FriendshipStatus;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("""
            select f from Friendship f
            where (f.requester.id = :firstId and f.recipient.id = :secondId)
               or (f.requester.id = :secondId and f.recipient.id = :firstId)
            """)
    Optional<Friendship> findBetween(@Param("firstId") Long firstId, @Param("secondId") Long secondId);

    @EntityGraph(attributePaths = "requester")
    List<Friendship> findByRecipientIdAndStatusOrderByCreatedAtAsc(Long recipientId, FriendshipStatus status);

    @EntityGraph(attributePaths = {"requester", "recipient"})
    @Query("""
            select f from Friendship f
            where f.status = :status
              and (f.requester.id = :userId or f.recipient.id = :userId)
            order by f.acceptedAt desc
            """)
    List<Friendship> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") FriendshipStatus status);
}
