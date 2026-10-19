package ru.sportikus.friendship.dto;

/** Connection state of the profile owner from the current viewer's point of view. */
public enum FriendshipState {
    NONE,
    OUTGOING_PENDING,
    INCOMING_PENDING,
    FRIENDS
}
