package ru.sportikus.event.service;

import ru.sportikus.event.model.Event;

/** Правила «кто управляет мероприятием». */
public final class EventAccess {

    private EventAccess() {
    }

    /** Управляет автор мероприятия или владелец организации, от имени которой оно создано. */
    public static boolean isManager(Event event, Long userId) {
        if (userId == null) {
            return false;
        }
        if (event.getOrganizerUser() != null && userId.equals(event.getOrganizerUser().getId())) {
            return true;
        }
        return event.getOrganizerOrg() != null
                && event.getOrganizerOrg().getOwner() != null
                && userId.equals(event.getOrganizerOrg().getOwner().getId());
    }
}
