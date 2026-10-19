package ru.sportikus.subscription.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.sportikus.security.CurrentUser;
import ru.sportikus.subscription.dto.OrganizationSubscriptionResponse;
import ru.sportikus.subscription.service.OrganizationSubscriptionService;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OrganizationSubscriptionController {
    private final OrganizationSubscriptionService service;

    @PostMapping("/organizations/{id}/subscription")
    public void subscribe(@PathVariable Long id) { service.subscribe(CurrentUser.require(), id); }

    @DeleteMapping("/organizations/{id}/subscription")
    public void unsubscribe(@PathVariable Long id) { service.unsubscribe(CurrentUser.require(), id); }

    @GetMapping("/me/subscriptions")
    public List<OrganizationSubscriptionResponse> mine() { return service.mine(CurrentUser.require()); }
}
