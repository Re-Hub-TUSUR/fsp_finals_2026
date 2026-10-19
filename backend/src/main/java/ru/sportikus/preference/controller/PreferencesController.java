package ru.sportikus.preference.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.preference.dto.PreferencesDto;
import ru.sportikus.preference.dto.UpdatePreferencesRequest;
import ru.sportikus.preference.service.PreferencesService;
import ru.sportikus.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/me/preferences")
@RequiredArgsConstructor
@Tag(name = "Preferences", description = "Интересы и предпочтения пользователя (регистрация и профиль)")
public class PreferencesController {

    private final PreferencesService preferencesService;

    @GetMapping
    @Operation(summary = "Мои интересы и предпочтения")
    public PreferencesDto get() {
        return preferencesService.get(CurrentUser.require().id());
    }

    @PutMapping
    @Operation(summary = "Сохранить интересы и предпочтения",
            description = "Вызывается из формы регистрации и из профиля. Полностью заменяет сохранённые значения.")
    public PreferencesDto update(@Valid @RequestBody UpdatePreferencesRequest request) {
        return preferencesService.update(CurrentUser.require().id(), request);
    }
}
