package ru.sportikus.event.service;

import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.model.RecurrenceRule;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.UUID;

/** Повторяющиеся мероприятия: расчёт следующего занятия серии. */
public final class Recurrence {

    private Recurrence() {
    }

    /**
     * Следующее занятие повторяющегося мероприятия — копия завершённого со сдвинутым началом.
     * Сдвиг считается по местному времени площадки, а не фиксированными сутками в UTC: иначе при переходе на
     * летнее или зимнее время встреча «в 19:00» уехала бы на час. Если сдвинутое начало всё ещё в прошлом
     * (завершили с большим опозданием), прибавляем интервал, пока оно не окажется в будущем.
     * Участники и заявки не копируются — на новое занятие записываются заново.
     */
    public static Event nextOccurrence(Event source, Instant now) {
        int intervalDays = source.getRecurrenceIntervalDays() == null ? 7 : source.getRecurrenceIntervalDays();
        ZoneId zone = source.getTimeZone() == null ? ZoneOffset.UTC : ZoneId.of(source.getTimeZone());
        ZonedDateTime nextLocalStart = source.getStartTime().atZone(zone).plusDays(intervalDays);
        Instant nextStart = nextLocalStart.toInstant();
        while (!nextStart.isAfter(now)) {
            nextLocalStart = nextLocalStart.plusDays(intervalDays);
            nextStart = nextLocalStart.toInstant();
        }
        Duration shift = Duration.between(source.getStartTime(), nextStart);
        return Event.builder()
                .title(source.getTitle())
                .description(source.getDescription())
                .sport(source.getSport())
                .template(source.getTemplate())
                .organizerUser(source.getOrganizerUser())
                .organizerOrg(source.getOrganizerOrg())
                .startTime(nextStart)
                .endTime(source.getEndTime().plus(shift))
                .recurrenceRule(RecurrenceRule.CUSTOM)
                .recurrenceIntervalDays(intervalDays)
                .recurrenceSeriesId(source.getRecurrenceSeriesId() != null
                        ? source.getRecurrenceSeriesId() : UUID.randomUUID())
                .lat(source.getLat())
                .lng(source.getLng())
                .address(source.getAddress())
                .city(source.getCity())
                .timeZone(source.getTimeZone())
                .capacity(source.getCapacity())
                .joinMode(source.getJoinMode())
                .skillLevel(source.getSkillLevel())
                .requiredEquipment(source.getRequiredEquipment())
                .price(source.getPrice())
                .registrationDeadline(source.getRegistrationDeadline() == null
                        ? null : source.getRegistrationDeadline().plus(shift))
                .minAge(source.getMinAge())
                .maxAge(source.getMaxAge())
                .fields(new ArrayList<>(source.getFields()))
                .details(new LinkedHashMap<>(source.getDetails()))
                .customFields(new ArrayList<>(source.getCustomFields()))
                .registrationFields(new ArrayList<>(source.getRegistrationFields()))
                .orgDetails(source.getOrgDetails())
                .status(EventStatus.PUBLISHED)
                .moderationStatus(source.getModerationStatus())
                .moderationReason(source.getModerationReason())
                .moderationHits(new ArrayList<>(source.getModerationHits()))
                .moderationModel(source.getModerationModel())
                .moderatedAt(source.getModeratedAt())
                .build();
    }
}
