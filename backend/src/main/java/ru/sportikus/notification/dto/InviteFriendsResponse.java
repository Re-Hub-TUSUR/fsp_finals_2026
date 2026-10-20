package ru.sportikus.notification.dto;

import java.util.List;

/**
 * Итог приглашения: кому ушло уведомление и кого пропустили. Пропуски — не ошибка:
 * повторно звать того же друга на то же событие не нужно, а записавшегося — бессмысленно.
 */
public record InviteFriendsResponse(
        int invitedCount,
        List<Long> invitedUserIds,
        List<Long> alreadyInvitedIds,
        List<Long> alreadyParticipatingIds
) {
}
