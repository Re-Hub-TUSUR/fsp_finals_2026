package ru.sportikus.event.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.Event;
import ru.sportikus.participation.dto.ParticipationBrief;
import ru.sportikus.participation.model.Participation;
import ru.sportikus.participation.model.ParticipationStatus;
import ru.sportikus.participation.repository.ParticipationRepository;
import ru.sportikus.sport.dto.SportDto;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Собирает EventResponse: подмешивает счётчики мест и состояние участия просматривающего пользователя. */
@Component
@RequiredArgsConstructor
public class EventMapper {

    private final ParticipationRepository participationRepository;

    private record Counts(int confirmed, int pending) {
    }

    /** Лёгкое представление для списков и карты. Вызывать внутри транзакции. */
    public List<EventResponse> toList(List<Event> events, Long viewerId, boolean includePending) {
        if (events.isEmpty()) {
            return List.of();
        }
        List<Long> ids = events.stream().map(Event::getId).toList();
        Map<Long, Counts> counts = loadCounts(ids);
        Map<Long, Participation> mine = viewerId == null ? Map.of()
                : participationRepository.findByUserIdAndEventIdIn(viewerId, ids).stream()
                        .collect(Collectors.toMap(p -> p.getEvent().getId(), p -> p));
        return events.stream()
                .map(e -> build(e, counts.getOrDefault(e.getId(), new Counts(0, 0)), mine.get(e.getId()),
                        false, viewerId, includePending))
                .toList();
    }

    /** Полная карточка мероприятия. Вызывать внутри транзакции. */
    public EventResponse toDetails(Event event, Long viewerId) {
        Counts counts = loadCounts(List.of(event.getId())).getOrDefault(event.getId(), new Counts(0, 0));
        Participation mine = viewerId == null ? null
                : participationRepository.findByEventIdAndUserId(event.getId(), viewerId).orElse(null);
        return build(event, counts, mine, true, viewerId, false);
    }

    private Map<Long, Counts> loadCounts(List<Long> ids) {
        Map<Long, int[]> acc = new HashMap<>();
        for (ParticipationRepository.StatusCount row : participationRepository.countByEvents(ids)) {
            int[] c = acc.computeIfAbsent(row.getEventId(), k -> new int[2]);
            if (row.getStatus() == ParticipationStatus.CONFIRMED) {
                c[0] = row.getCnt().intValue();
            } else {
                c[1] = row.getCnt().intValue();
            }
        }
        Map<Long, Counts> result = new HashMap<>();
        acc.forEach((id, c) -> result.put(id, new Counts(c[0], c[1])));
        return result;
    }

    private EventResponse build(Event e, Counts counts, Participation mine, boolean detailed,
                                Long viewerId, boolean includePending) {
        boolean byOrg = e.isByOrganization();
        String organizerName = byOrg ? e.getOrganizerOrg().getName() : e.getOrganizerUser().getFullName();
        String organizerAvatar = byOrg ? e.getOrganizerOrg().getLogoUrl() : e.getOrganizerUser().getAvatarUrl();
        boolean manager = EventAccess.isManager(e, viewerId);
        EventResponse.TemplateRef template = e.getTemplate() == null ? null
                : new EventResponse.TemplateRef(e.getTemplate().getId(), e.getTemplate().getCode(),
                        e.getTemplate().getName(), e.getTemplate().getIcon());

        return new EventResponse(
                e.getId(), e.getTitle(), e.getDescription(), SportDto.from(e.getSport()), template,
                organizerName, organizerAvatar, byOrg, byOrg ? e.getOrganizerOrg().getId() : null,
                e.getStartTime(), e.getEndTime(), e.getLat(), e.getLng(), e.getAddress(),
                e.getCity() == null ? null : e.getCity().getName(), e.getTimeZone(),
                e.getCapacity(), counts.confirmed(), e.getJoinMode(), e.getSkillLevel(), e.getPrice(),
                e.getRegistrationDeadline(), e.getMinAge(), e.getMaxAge(), e.getRequiredEquipment(),
                e.getStatus(), e.getUnpublishReason(),
                detailed ? e.getFields() : null,
                detailed ? e.getDetails() : null,
                detailed ? e.getCustomFields() : null,
                detailed ? e.getRegistrationFields() : null,
                detailed ? e.getOrgDetails() : null,
                mine == null ? null : ParticipationBrief.from(mine),
                viewerId == null ? null : manager,
                manager && (detailed || includePending) ? counts.pending() : null);
    }
}
