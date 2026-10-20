package ru.sportikus.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.common.ApiException;
import ru.sportikus.organization.model.Organization;
import ru.sportikus.organization.model.OrganizationStatus;
import ru.sportikus.organization.repository.OrganizationRepository;
import ru.sportikus.security.JwtService;
import ru.sportikus.security.Roles;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> ApiException.unauthorized("Неверный e-mail или пароль"));
        return new AuthResponse(jwtService.generate(user), toDto(user));
    }

    @Transactional
    public AuthResponse registerUser(UserRegistrationRequest request) {
        String email = normalizeEmail(request.email());
        ensureEmailAvailable(email);
        User user = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.firstName().trim() + " " + request.lastName().trim())
                .role(Roles.USER)
                .build());
        return new AuthResponse(jwtService.generate(user), toDto(user));
    }

    @Transactional
    public AuthResponse registerOrganization(OrganizationRegistrationRequest request) {
        String email = normalizeEmail(request.email());
        ensureEmailAvailable(email);
        if (organizationRepository.existsByInn(request.inn()) || organizationRepository.existsByOgrn(request.ogrn())) {
            throw ApiException.conflict("Организация с таким ИНН или ОГРН уже зарегистрирована");
        }
        User owner = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.name().trim())
                .role(Roles.ORGANIZER)
                .build());
        organizationRepository.save(Organization.builder()
                .name(request.name().trim())
                .inn(request.inn())
                .ogrn(request.ogrn())
                .kpp(request.kpp())
                .owner(owner)
                .status(OrganizationStatus.PENDING)
                .build());
        return new AuthResponse(jwtService.generate(owner), toDto(owner));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private void ensureEmailAvailable(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Аккаунт с таким e-mail уже существует");
        }
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Пользователь не найден, войдите заново"));
        return toDto(user);
    }

    private UserDto toDto(User user) {
        Organization org = Roles.ORGANIZER.equals(user.getRole())
                ? organizationRepository.findFirstByOwnerIdOrderByIdAsc(user.getId()).orElse(null)
                : null;
        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), user.getAvatarUrl(),
                org == null ? null : org.getId(),
                org == null ? null : org.getName(),
                org == null ? null : org.getStatus(),
                org == null ? null : org.getRejectReason());
    }
}
