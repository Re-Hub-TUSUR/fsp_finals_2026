package ru.sportikus.user.controller;

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
public class ProfileController {
    private final ProfileService profileService;

    @GetMapping("/users/{id}")
    public ProfileResponse user(@PathVariable Long id) { return profileService.user(id, CurrentUser.get().orElse(null)); }

    @GetMapping("/organizations/{id}")
    public ProfileResponse organization(@PathVariable Long id) { return profileService.organization(id, CurrentUser.get().orElse(null)); }

    @PatchMapping("/users/{id}")
    public ProfileResponse updateUser(@PathVariable Long id, @Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.updateUser(id, CurrentUser.require(), request);
    }

    @PatchMapping("/organizations/{id}")
    public ProfileResponse updateOrganization(@PathVariable Long id, @Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.updateOrganization(id, CurrentUser.require(), request);
    }

    @PostMapping(value = "/users/{id}/image", consumes = "multipart/form-data")
    public ProfileResponse uploadUserImage(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        return profileService.uploadUserImage(id, CurrentUser.require(), file);
    }

    @PostMapping(value = "/organizations/{id}/image", consumes = "multipart/form-data")
    public ProfileResponse uploadOrganizationImage(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        return profileService.uploadOrganizationImage(id, CurrentUser.require(), file);
    }
}
