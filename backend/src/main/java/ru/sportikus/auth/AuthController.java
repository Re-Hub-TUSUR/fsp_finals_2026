package ru.sportikus.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Вход и профиль текущего пользователя")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Войти по e-mail и паролю, получить JWT")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register/user")
    @Operation(summary = "Регистрация обычного пользователя")
    public AuthResponse registerUser(@Valid @RequestBody UserRegistrationRequest request) {
        return authService.registerUser(request);
    }

    @PostMapping("/register/organization")
    @Operation(summary = "Регистрация организации с заявкой на модерацию")
    public AuthResponse registerOrganization(@Valid @RequestBody OrganizationRegistrationRequest request) {
        return authService.registerOrganization(request);
    }

    @GetMapping("/me")
    @Operation(summary = "Профиль текущего пользователя")
    public UserDto me() {
        return authService.me(CurrentUser.require().id());
    }
}
