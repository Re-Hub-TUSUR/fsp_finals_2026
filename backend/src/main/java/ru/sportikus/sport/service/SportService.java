package ru.sportikus.sport.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.sportikus.common.ApiException;
import ru.sportikus.sport.SlugUtil;
import ru.sportikus.sport.model.Sport;
import ru.sportikus.sport.repository.SportRepository;
import ru.sportikus.user.model.User;

@Service
@RequiredArgsConstructor
public class SportService {

    private static final int MAX_NAME = 60;

    private final SportRepository sportRepository;

    /**
     * Находит вид спорта по id либо по названию (через slug) и при необходимости создаёт новый —
     * пользователь может ввести любой вид активности без изменения кода.
     */
    public Sport resolve(Long sportId, String customName, User author) {
        if (sportId != null) {
            return sportRepository.findById(sportId)
                    .orElseThrow(() -> ApiException.badRequest("Вид спорта не найден"));
        }
        if (customName == null || customName.isBlank()) {
            throw ApiException.badRequest("Выберите вид спорта или введите свой");
        }
        String name = customName.trim().replaceAll("\\s+", " ");
        if (name.length() > MAX_NAME) {
            throw ApiException.badRequest("Название вида спорта не длиннее " + MAX_NAME + " символов");
        }
        String slug = SlugUtil.slugify(name);
        if (slug.isEmpty()) {
            throw ApiException.badRequest("Название вида спорта должно содержать буквы или цифры");
        }
        return sportRepository.findBySlug(slug).orElseGet(() -> sportRepository.save(Sport.builder()
                .name(name.substring(0, 1).toUpperCase() + name.substring(1))
                .slug(slug)
                .isCustom(true)
                .createdBy(author)
                .build()));
    }
}
