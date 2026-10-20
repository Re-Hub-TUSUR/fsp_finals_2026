package ru.sportikus.event.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.Event;
import ru.sportikus.organization.repository.OrganizationRepository;
import ru.sportikus.participation.dto.ParticipationBrief;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.sport.dto.SportDto;

import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Собирает EventResponse: подмешивает счётчики мест и состояние участия просматривающего пользователя. */
@Component
@RequiredArgsConstructor
public class EventMapper {

    private final ParticipationRepository participationRepository;
    private final OrganizationRepository organizationRepository;

    private record Counts(int confirmed, int pending, int waitlisted) {
    }

    /** Лёгкое представление для списков и карты. Вызывать внутри транзакции. */
    public List<EventResponse> toList(List<Event> events, Long viewerId, boolean includePending) {
        return toList(events, viewerId, includePending, false);
    }

    /** То же, с результатом автопроверки — для администратора. */
    public List<EventResponse> toList(List<Event> events, Long viewerId, boolean includePending, boolean includeModeration) {
        if (events.isEmpty()) {
            return List.of();
        }
        List<Long> ids = events.stream().map(Event::getId).toList();
        Map<Long, Counts> counts = loadCounts(ids);
        Map<Long, List<EventResponse.FriendAttendee>> friends = loadFriends(ids, viewerId);
        Map<Long, Participation> mine = viewerId == null ? Map.of()
                : participationRepository.findByUserIdAndEventIdIn(viewerId, ids).stream()
                        .collect(Collectors.toMap(p -> p.getEvent().getId(), p -> p));
        return events.stream()
                .map(e -> build(e, counts.getOrDefault(e.getId(), new Counts(0, 0, 0)), mine.get(e.getId()),
                        friends.getOrDefault(e.getId(), List.of()), false, viewerId, includePending, includeModeration))
                .toList();
    }

    /**
     * Подмешивает контекст пользователя (друзья, своя заявка, право управлять) в список, построенный для
     * анонимного просмотра — например, взятый из кэша. Результат совпадает с {@code toList(events, viewerId, false)}.
     */
    public List<EventResponse> withViewer(List<EventResponse> base, Long viewerId) {
        if (viewerId == null || base.isEmpty()) {
            return base;
        }
        List<Long> ids = base.stream().map(EventResponse::id).toList();
        Map<Long, List<EventResponse.FriendAttendee>> friends = loadFriends(ids, viewerId);
        Map<Long, Participation> mine = participationRepository.findByUserIdAndEventIdIn(viewerId, ids).stream()
                .collect(Collectors.toMap(p -> p.getEvent().getId(), p -> p));
        Long ownedOrgId = organizationRepository.findFirstByOwnerIdOrderByIdAsc(viewerId)
                .map(o -> o.getId()).orElse(null);
        return base.stream()
                .map(e -> e.withViewer(
                        friends.getOrDefault(e.id(), List.of()),
                        mine.get(e.id()) == null ? null : ParticipationBrief.from(mine.get(e.id())),
                        viewerId.equals(e.organizerUserId())
                                || (ownedOrgId != null && ownedOrgId.equals(e.organizationId()))))
                .toList();
    }

    /** Полная карточка мероприятия. Вызывать внутри транзакции. */
    public EventResponse toDetails(Event event, Long viewerId) {
        return toDetails(event, viewerId, false);
    }

    /** Полная карточка; с результатом автопроверки — для администратора. */
    public EventResponse toDetails(Event event, Long viewerId, boolean includeModeration) {
        Counts counts = loadCounts(List.of(event.getId())).getOrDefault(event.getId(), new Counts(0, 0, 0));
        Participation mine = viewerId == null ? null
                : participationRepository.findByEventIdAndUserId(event.getId(), viewerId).orElse(null);
        return build(event, counts, mine, loadFriends(List.of(event.getId()), viewerId).getOrDefault(event.getId(), List.of()),
                true, viewerId, false, includeModeration);
    }

    private Map<Long, Counts> loadCounts(List<Long> ids) {
        Map<Long, int[]> acc = new HashMap<>();
        for (ParticipationRepository.StatusCount row : participationRepository.countByEvents(ids)) {
            int[] c = acc.computeIfAbsent(row.getEventId(), k -> new int[3]);
            if (row.getStatus() == ParticipationStatus.CONFIRMED) {
                c[0] = row.getCnt().intValue();
            } else if (row.getStatus() == ParticipationStatus.WAITLISTED) {
                c[2] = row.getCnt().intValue();
            } else {
                c[1] = row.getCnt().intValue();
            }
        }
        Map<Long, Counts> result = new HashMap<>();
        acc.forEach((id, c) -> result.put(id, new Counts(c[0], c[1], c[2])));
        return result;
    }

    private Map<Long, List<EventResponse.FriendAttendee>> loadFriends(List<Long> ids, Long viewerId) {
        if (viewerId == null) return Map.of();
        Map<Long, List<EventResponse.FriendAttendee>> result = new HashMap<>();
        for (ParticipationRepository.FriendAttendee row : participationRepository.findConfirmedFriendsByEventIds(viewerId, ids)) {
            result.computeIfAbsent(row.getEventId(), ignored -> new ArrayList<>())
                    .add(new EventResponse.FriendAttendee(row.getUserId(), row.getFullName(), row.getAvatarUrl()));
        }
        return result;
    }

    private EventResponse build(Event e, Counts counts, Participation mine, List<EventResponse.FriendAttendee> friends,
                                boolean detailed,
                                Long viewerId, boolean includePending, boolean includeModeration) {
        boolean byOrg = e.isByOrganization();
        String organizerName = byOrg ? e.getOrganizerOrg().getName() : e.getOrganizerUser().getFullName();
        String organizerAvatar = byOrg ? e.getOrganizerOrg().getLogoUrl() : e.getOrganizerUser().getAvatarUrl();
        boolean manager = EventAccess.isManager(e, viewerId);
        EventResponse.TemplateRef template = e.getTemplate() == null ? null
                : new EventResponse.TemplateRef(e.getTemplate().getId(), e.getTemplate().getCode(),
                        e.getTemplate().getName(), e.getTemplate().getIcon());
        EventResponse.ModerationInfo moderation = includeModeration
                ? new EventResponse.ModerationInfo(e.getModerationStatus(), e.getModerationReason(),
                        e.getModerationHits(), e.getModerationModel(), e.getModeratedAt())
                : null;

        return new EventResponse(
                e.getId(), e.getTitle(), e.getDescription(), SportDto.from(e.getSport()), template,
                organizerName, organizerAvatar, byOrg, byOrg ? e.getOrganizerOrg().getId() : null,
                byOrg ? null : e.getOrganizerUser().getId(),
                e.getStartTime(), e.getEndTime(), e.getRecurrenceRule(), e.getRecurrenceIntervalDays(), e.getNextOccurrenceId(), e.getLat(), e.getLng(), e.getAddress(),
                e.getCity() == null ? null : e.getCity().getName(), e.getTimeZone(),
                e.getCapacity(), counts.confirmed(), counts.waitlisted(), e.getJoinMode(), e.getSkillLevel(), e.getPrice(),
                e.getRegistrationDeadline(), e.getMinAge(), e.getMaxAge(), e.getRequiredEquipment(),
                e.getStatus(), e.getUnpublishReason(),
                detailed ? e.getFields() : null,
                detailed ? e.getDetails() : null,
                detailed ? e.getCustomFields() : null,
                detailed ? e.getRegistrationFields() : null,
                detailed ? e.getOrgDetails() : null,
                friends,
                mine == null ? null : ParticipationBrief.from(mine),
                viewerId == null ? null : manager,
                manager && (detailed || includePending) ? counts.pending() : null,
                moderation);
    }
}
