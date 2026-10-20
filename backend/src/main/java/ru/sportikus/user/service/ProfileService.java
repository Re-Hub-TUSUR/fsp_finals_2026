package ru.sportikus.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventMapper;
import ru.sportikus.friendship.service.FriendshipService;
import ru.sportikus.organization.model.Organization;
import ru.sportikus.organization.repository.OrganizationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.subscription.service.OrganizationSubscriptionService;
import ru.sportikus.user.dto.ProfileResponse;
import ru.sportikus.user.dto.ProfileUpdateRequest;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Map<String, String> IMAGE_EXTENSIONS = Map.of(
            "image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp");

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final EventRepository eventRepository;
    private final EventMapper eventMapper;
    private final FriendshipService friendshipService;
    private final OrganizationSubscriptionService subscriptionService;

    @Transactional(readOnly = true)
    public ProfileResponse user(Long id, AuthUser viewer) {
        User user = userRepository.require(id);
        boolean owner = viewer != null && viewer.id().equals(id);
        var events = eventRepository.findByOrganizerUserIdAndStatusOrderByStartTimeAsc(id, EventStatus.PUBLISHED);
        return new ProfileResponse(id, "USER", user.getFullName(), user.getEmail(), null, user.getAvatarUrl(),
                null, null, null, null, owner, friendshipService.state(viewer == null ? null : viewer.id(), id), null, null,
                eventMapper.toList(events, viewer == null ? null : viewer.id(), false));
    }

    @Transactional(readOnly = true)
    public ProfileResponse organization(Long id, AuthUser viewer) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Организация не найдена"));
        boolean owner = viewer != null && org.getOwner().getId().equals(viewer.id());
        boolean admin = viewer != null && "ROLE_ADMIN".equals(viewer.role());
        if (!"APPROVED".equals(org.getStatus()) && !owner && !admin) {
            throw ApiException.notFound("Организация не найдена");
        }
        var events = eventRepository.findByOrganizerOrgIdAndStatusOrderByStartTimeAsc(id, EventStatus.PUBLISHED);
        return new ProfileResponse(id, "ORGANIZATION", org.getName(), org.getOwner().getEmail(), org.getDescription(),
                org.getLogoUrl(), org.getInn(), org.getOgrn(), org.getKpp(), org.getStatus(), owner, null,
                subscriptionService.count(id), subscriptionService.subscribed(viewer == null ? null : viewer.id(), id),
                eventMapper.toList(events, viewer == null ? null : viewer.id(), false));
    }

    @Transactional
    public ProfileResponse updateUser(Long id, AuthUser viewer, ProfileUpdateRequest request) {
        if (!id.equals(viewer.id())) throw ApiException.forbidden("Редактировать профиль может только его владелец");
        User user = userRepository.require(id);
        user.setFullName(request.name().trim());
        user.setAvatarUrl(blankToNull(request.imageUrl()));
        return user(id, viewer);
    }

    @Transactional
    public ProfileResponse updateOrganization(Long id, AuthUser viewer, ProfileUpdateRequest request) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Организация не найдена"));
        if (!org.getOwner().getId().equals(viewer.id())) throw ApiException.forbidden("Редактировать профиль может только его владелец");
        org.setName(request.name().trim());
        org.setDescription(blankToNull(request.description()));
        org.setLogoUrl(blankToNull(request.imageUrl()));
        return organization(id, viewer);
    }

    @Transactional
    public ProfileResponse uploadUserImage(Long id, AuthUser viewer, MultipartFile file) {
        if (!id.equals(viewer.id())) throw ApiException.forbidden("Изменить фото может только владелец профиля");
        User user = userRepository.require(id);
        user.setAvatarUrl(storeImage(file));
        return user(id, viewer);
    }

    @Transactional
    public ProfileResponse uploadOrganizationImage(Long id, AuthUser viewer, MultipartFile file) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Организация не найдена"));
        if (!org.getOwner().getId().equals(viewer.id())) throw ApiException.forbidden("Изменить логотип может только владелец профиля");
        org.setLogoUrl(storeImage(file));
        return organization(id, viewer);
    }

    private String storeImage(MultipartFile file) {
        if (file.isEmpty()) throw ApiException.badRequest("Выберите файл изображения");
        if (file.getSize() > MAX_IMAGE_SIZE) throw ApiException.badRequest("Размер изображения не должен превышать 5 МБ");
        String extension = IMAGE_EXTENSIONS.get(file.getContentType());
        if (extension == null) throw ApiException.badRequest("Допустимы изображения JPG, PNG и WebP");
        try {
            Path directory = Path.of(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            String filename = UUID.randomUUID() + extension;
            Files.copy(file.getInputStream(), directory.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + filename;
        } catch (IOException e) {
            throw ApiException.badRequest("Не удалось сохранить изображение");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
