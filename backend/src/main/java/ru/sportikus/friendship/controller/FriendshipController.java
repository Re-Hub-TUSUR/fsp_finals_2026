package ru.sportikus.friendship.controller;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.sportikus.friendship.dto.FriendRequestResponse;
import ru.sportikus.friendship.dto.FriendResponse;
import ru.sportikus.friendship.dto.FriendshipResponse;
import ru.sportikus.friendship.service.FriendshipService;
import ru.sportikus.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class FriendshipController {
    private final FriendshipService friendshipService;

    @PostMapping("/friends/{userId}")
    @Operation(summary = "Отправить заявку в друзья")
    public FriendshipResponse request(@PathVariable Long userId) { return friendshipService.request(CurrentUser.require(), userId); }

    @DeleteMapping("/friends/{userId}")
    @Operation(summary = "Отменить исходящую заявку или удалить друга")
    public void remove(@PathVariable Long userId) { friendshipService.remove(CurrentUser.require(), userId); }

    @PostMapping("/friends/{userId}/accept")
    @Operation(summary = "Принять входящую заявку в друзья")
    public FriendshipResponse accept(@PathVariable Long userId) { return friendshipService.accept(CurrentUser.require(), userId); }

    @PostMapping("/friends/{userId}/reject")
    @Operation(summary = "Отклонить входящую заявку в друзья")
    public void reject(@PathVariable Long userId) { friendshipService.reject(CurrentUser.require(), userId); }

    @GetMapping("/me/friend-requests")
    @Operation(summary = "Входящие заявки в друзья")
    public List<FriendRequestResponse> incoming() { return friendshipService.incoming(CurrentUser.require()); }

    @GetMapping("/me/friends")
    @Operation(summary = "Подтверждённые друзья текущего пользователя")
    public List<FriendResponse> friends() { return friendshipService.friends(CurrentUser.require()); }
}
