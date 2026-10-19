package ru.sportikus.notification.dto;

import java.util.List;

public record InviteFriendsResponse(
        int invitedCount,
        List<Long> invitedUserIds
) {
}
