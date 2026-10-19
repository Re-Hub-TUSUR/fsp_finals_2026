package ru.sportikus.preference.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.city.dto.CityDto;
import ru.sportikus.city.model.City;
import ru.sportikus.city.repository.CityRepository;
import ru.sportikus.common.ApiException;
import ru.sportikus.preference.PreferencesChangedEvent;
import ru.sportikus.preference.dto.PreferencesDto;
import ru.sportikus.preference.dto.UpdatePreferencesRequest;
import ru.sportikus.preference.model.UserPreferences;
import ru.sportikus.preference.repository.UserInterestRepository;
import ru.sportikus.preference.repository.UserPreferencesRepository;
import ru.sportikus.sport.dto.SportDto;
import ru.sportikus.sport.model.Sport;
import ru.sportikus.sport.repository.SportRepository;

import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PreferencesService {

    private final UserPreferencesRepository preferencesRepository;
    private final UserInterestRepository interestRepository;
    private final SportRepository sportRepository;
    private final CityRepository cityRepository;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public PreferencesDto get(Long userId) {
        return toDto(preferencesRepository.findWithCityByUserId(userId), interestRepository.sportIds(userId));
    }

    /** Предпочтения для движка рекомендаций (без DTO). */
    @Transactional(readOnly = true)
    public Optional<UserPreferences> find(Long userId) {
        return preferencesRepository.findWithCityByUserId(userId);
    }

    @Transactional
    public PreferencesDto update(Long userId, UpdatePreferencesRequest req) {
        Set<Long> sportIds = new LinkedHashSet<>(req.sportIds() == null ? List.of() : req.sportIds());
        if (!sportIds.isEmpty() && sportRepository.findAllById(sportIds).size() != sportIds.size()) {
            throw ApiException.badRequest("Некоторые виды спорта не найдены");
        }
        if ((req.homeLat() == null) != (req.homeLng() == null)) {
            throw ApiException.badRequest("Укажите обе координаты дома или ни одной");
        }
        if (req.birthYear() != null && req.birthYear() > Year.now().getValue()) {
            throw ApiException.badRequest("Некорректный год рождения");
        }
        City city = req.homeCityId() == null ? null : cityRepository.findById(req.homeCityId())
                .orElseThrow(() -> ApiException.badRequest("Город не найден"));
        if (city == null && req.homeLat() != null) {
            // Город не выбран, но есть точка — берём ближайший, чтобы знать часовой пояс и «популярное рядом»
            city = cityRepository.findNearest(req.homeLat(), req.homeLng()).orElse(null);
        }

        UserPreferences prefs = preferencesRepository.findById(userId)
                .orElseGet(() -> UserPreferences.builder().userId(userId).build());
        prefs.setSkillLevel(req.skillLevel());
        prefs.setHomeCity(city);
        prefs.setHomeLat(req.homeLat());
        prefs.setHomeLng(req.homeLng());
        prefs.setMaxDistanceKm(req.maxDistanceKm() == null ? 25 : req.maxDistanceKm());
        prefs.setPreferredTimes(req.preferredTimes() == null ? new ArrayList<>()
                : new ArrayList<>(new LinkedHashSet<>(req.preferredTimes())));
        prefs.setMaxPrice(req.maxPrice());
        prefs.setBirthYear(req.birthYear());
        preferencesRepository.save(prefs);
        interestRepository.replace(userId, sportIds);

        events.publishEvent(new PreferencesChangedEvent(userId));
        return toDto(Optional.of(prefs), sportIds);
    }

    private PreferencesDto toDto(Optional<UserPreferences> prefs, Set<Long> sportIds) {
        Map<Long, Sport> sports = sportRepository.findAllById(sportIds).stream()
                .collect(Collectors.toMap(Sport::getId, Function.identity()));
        List<SportDto> ordered = sportIds.stream().map(sports::get).filter(s -> s != null).map(SportDto::from).toList();
        UserPreferences p = prefs.orElse(null);
        boolean configured = !ordered.isEmpty() || (p != null && (p.getHomeCity() != null || p.getHomeLat() != null));
        if (p == null) {
            return new PreferencesDto(ordered, null, null, null, null, 25, List.of(), null, null, configured);
        }
        return new PreferencesDto(ordered, p.getSkillLevel(), CityDto.from(p.getHomeCity()), p.getHomeLat(), p.getHomeLng(),
                p.getMaxDistanceKm(), p.getPreferredTimes(), p.getMaxPrice(), p.getBirthYear(), configured);
    }
}
