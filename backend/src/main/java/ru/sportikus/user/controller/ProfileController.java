package ru.sportikus.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.sportikus.security.CurrentUser;
import ru.sportikus.user.dto.ProfileResponse;
import ru.sportikus.user.dto.ProfileUpdateRequest;
import ru.sportikus.user.service.ProfileService;

@RestController
@RequestMapping("/api/v1/profiles")
@RequiredArgsConstructor
@Tag(name = "Profiles", description = "Публичные профили пользователей и организаций, редактирование, загрузка фото и логотипа")
public class ProfileController {
    private final ProfileService profileService;

    @GetMapping("/users/{id}")
    @Operation(summary = "Профиль пользователя",
            description = "Публичный. Содержит текущие опубликованные мероприятия пользователя; `canEdit = true`, если профиль открыл его владелец.")
    public ProfileResponse user(@PathVariable Long id) { return profileService.user(id, CurrentUser.get().orElse(null)); }

    @GetMapping("/organizations/{id}")
    @Operation(summary = "Профиль организации",
            description = "Публичный для одобренных организаций (с реквизитами ИНН/ОГРН/КПП и текущими мероприятиями). "
                    + "Организация не в статусе `APPROVED` видна только владельцу и администратору, остальным — `404`.")
    public ProfileResponse organization(@PathVariable Long id) { return profileService.organization(id, CurrentUser.get().orElse(null)); }

    @PatchMapping("/users/{id}")
    @Operation(summary = "Изменить свой профиль",
            description = "Только владелец профиля (иначе `403`). Меняет имя и ссылку на фото; для загрузки файла используйте `POST /users/{id}/image`.")
    public ProfileResponse updateUser(@PathVariable Long id, @Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.updateUser(id, CurrentUser.require(), request);
    }

    @PatchMapping("/organizations/{id}")
    @Operation(summary = "Изменить профиль своей организации",
            description = "Только владелец организации (иначе `403`). Меняет название, описание и ссылку на логотип.")
    public ProfileResponse updateOrganization(@PathVariable Long id, @Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.updateOrganization(id, CurrentUser.require(), request);
    }

    @PostMapping(value = "/users/{id}/image", consumes = "multipart/form-data")
    @Operation(summary = "Загрузить фото профиля",
            description = "Только владелец профиля. Файл JPG, PNG или WebP до 5 МБ; сохраняется в каталог загрузок и отдаётся по `/uploads/{uuid}.{ext}`.")
    public ProfileResponse uploadUserImage(
            @Parameter(description = "Идентификатор пользователя") @PathVariable Long id,
            @Parameter(description = "Изображение JPG, PNG или WebP, не более 5 МБ") @RequestPart("file") MultipartFile file) {
        return profileService.uploadUserImage(id, CurrentUser.require(), file);
    }

    @PostMapping(value = "/organizations/{id}/image", consumes = "multipart/form-data")
    @Operation(summary = "Загрузить логотип организации",
            description = "Только владелец организации. Файл JPG, PNG или WebP до 5 МБ; отдаётся по `/uploads/{uuid}.{ext}`.")
    public ProfileResponse uploadOrganizationImage(
            @Parameter(description = "Идентификатор организации") @PathVariable Long id,
            @Parameter(description = "Изображение JPG, PNG или WebP, не более 5 МБ") @RequestPart("file") MultipartFile file) {
        return profileService.uploadOrganizationImage(id, CurrentUser.require(), file);
    }
}
