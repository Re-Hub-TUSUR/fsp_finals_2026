package ru.sportikus.achievement;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.sportikus.security.CurrentUser;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Achievements", description = "Достижения за активность: участие, дружба, организация мероприятий, виды спорта")
public class AchievementController {
    private final AchievementService service;

    @GetMapping("/profiles/users/{id}/achievements")
    @Operation(summary = "Достижения пользователя (публично)",
            description = "Список из 30 достижений с прогрессом: `progress` из `target`, `completed = true`, когда цель достигнута. "
                    + "Считается по данным участия, дружбы, созданных и завершённых мероприятий и видов спорта.")
    public List<AchievementDto> profile(@PathVariable Long id) { return service.forUser(id); }

    @GetMapping("/me/achievements")
    @Operation(summary = "Мои достижения",
            description = "То же, что у публичного профиля, для текущего пользователя. Клиент опрашивает метод, чтобы показать "
                    + "уведомление о новом достижении.")
    public List<AchievementDto> mine() { return service.forUser(CurrentUser.require().id()); }
}
