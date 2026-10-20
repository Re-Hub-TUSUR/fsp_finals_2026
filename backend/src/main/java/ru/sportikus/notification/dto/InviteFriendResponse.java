package ru.sportikus.notification.dto;

/** Друг в окне «Позвать друзей» и можно ли его позвать на это мероприятие. */
public record InviteFriendResponse(
        Long userId,
        String fullName,
        String avatarUrl,
        InviteState state
) {

    public enum InviteState {
        /** Можно пригласить. */
        AVAILABLE,
        /** Уже приглашён вами на это мероприятие. */
        INVITED,
        /** Уже записан, подал заявку, стоит в очереди или сам организует мероприятие. */
        PARTICIPATING
    }
}
