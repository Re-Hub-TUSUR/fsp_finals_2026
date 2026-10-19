package ru.sportikus.achievement;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.sportikus.security.CurrentUser;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AchievementController {
    private final AchievementService service;
    @GetMapping("/profiles/users/{id}/achievements")
    public List<AchievementDto> profile(@PathVariable Long id) { return service.forUser(id); }
    @GetMapping("/me/achievements")
    public List<AchievementDto> mine() { return service.forUser(CurrentUser.require().id()); }
}
