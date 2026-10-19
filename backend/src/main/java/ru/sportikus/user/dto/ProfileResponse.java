package ru.sportikus.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.friendship.dto.FriendshipState;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProfileResponse(
        Long id,
        String type,
        String name,
        String email,
        String description,
        String imageUrl,
        String inn,
        String ogrn,
        String kpp,
        String status,
        boolean canEdit,
        FriendshipState friendshipState,
        List<EventResponse> events
) {
}
