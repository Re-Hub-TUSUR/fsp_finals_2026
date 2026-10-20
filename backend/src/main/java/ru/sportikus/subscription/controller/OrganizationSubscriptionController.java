package ru.sportikus.subscription.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.sportikus.security.CurrentUser;
import ru.sportikus.subscription.dto.OrganizationSubscriptionResponse;
import ru.sportikus.subscription.service.OrganizationSubscriptionService;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Subscriptions", description = "Подписки пользователей на организации")
public class OrganizationSubscriptionController {
    private final OrganizationSubscriptionService service;

    @PostMapping("/organizations/{id}/subscription")
    @Operation(summary = "Подписаться на организацию",
            description = "Только на одобренную организацию и не на собственную. Повторная подписка ничего не меняет. "
                    + "Администратор не подписывается (`403`).")
    public void subscribe(@PathVariable Long id) { service.subscribe(CurrentUser.require(), id); }

    @DeleteMapping("/organizations/{id}/subscription")
    @Operation(summary = "Отписаться от организации")
    public void unsubscribe(@PathVariable Long id) { service.unsubscribe(CurrentUser.require(), id); }

    @GetMapping("/me/subscriptions")
    @Operation(summary = "Мои подписки",
            description = "Одобренные организации, на которые подписан пользователь, с числом подписчиков; новые подписки — первыми.")
    public List<OrganizationSubscriptionResponse> mine() { return service.mine(CurrentUser.require()); }
}
