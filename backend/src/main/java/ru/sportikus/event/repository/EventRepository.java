package ru.sportikus.event.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.moderation.ModerationStatus;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

    @Override
    @EntityGraph(attributePaths = {"sport", "organizerUser", "organizerOrg", "template", "city"})
    Page<Event> findAll(Specification<Event> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"sport", "organizerUser", "organizerOrg", "template", "city"})
    List<Event> findByIdIn(Collection<Long> ids);

    @EntityGraph(attributePaths = {"sport", "organizerUser", "organizerOrg", "template", "city"})
    @Query("select e from Event e where e.id = :id")
    Optional<Event> findDetailedById(@Param("id") Long id);

    /** Блокирует строку мероприятия на время транзакции — защита от гонок при выдаче последнего места. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Event e where e.id = :id")
    Optional<Event> findForUpdate(@Param("id") Long id);

    /** Мероприятие со связями для ответа API или 404. */
    default Event requireDetailed(Long id) {
        return findDetailedById(id).orElseThrow(EventRepository::notFound);
    }

    /** Мероприятие под блокировкой строки или 404. */
    default Event requireForUpdate(Long id) {
        return findForUpdate(id).orElseThrow(EventRepository::notFound);
    }

    private static ApiException notFound() {
        return ApiException.notFound("Мероприятие не найдено");
    }

    /** Мероприятия, которыми управляет пользователь: свои и своей организации. */
    @EntityGraph(attributePaths = {"sport", "organizerUser", "organizerOrg", "template", "city"})
    @Query("""
            select e from Event e left join e.organizerOrg o
            where e.organizerUser.id = :userId or o.owner.id = :userId
            order by e.startTime desc
            """)
    List<Event> findManagedBy(@Param("userId") Long userId);

    @EntityGraph(attributePaths = {"sport", "organizerUser", "organizerOrg", "template", "city"})
    List<Event> findAllByOrderByStartTimeDesc();

    /** Проверки ИИ, которые не завершились (например, после перезапуска). */
    List<Event> findTop20ByModerationStatusAndCreatedAtBeforeOrderByCreatedAtAsc(ModerationStatus status, Instant before);

    @EntityGraph(attributePaths = {"sport", "organizerUser", "organizerOrg", "template"})
    List<Event> findByOrganizerUserIdAndStatusOrderByStartTimeAsc(Long userId, EventStatus status);

    @EntityGraph(attributePaths = {"sport", "organizerUser", "organizerOrg", "template"})
    List<Event> findByOrganizerOrgIdAndStatusOrderByStartTimeAsc(Long organizationId, EventStatus status);

    /** Счётчик для лендинга: опубликованные встречи, которые ещё не начались. */
    long countByStatusAndStartTimeAfter(EventStatus status, Instant after);
}
