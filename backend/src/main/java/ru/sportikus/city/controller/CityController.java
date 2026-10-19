package ru.sportikus.city.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.city.dto.CityDto;
import ru.sportikus.city.repository.CityRepository;
import ru.sportikus.common.ApiException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cities")
@RequiredArgsConstructor
@Tag(name = "Cities", description = "Города и часовые пояса")
public class CityController {

    private final CityRepository cityRepository;

    @GetMapping
    @Operation(summary = "Справочник городов (по убыванию населения)")
    public List<CityDto> list() {
        return cityRepository.findAllByOrderByPopulationDescNameAsc().stream().map(CityDto::from).toList();
    }

    @GetMapping("/nearest")
    @Operation(summary = "Ближайший город к точке — его часовой пояс считается местным временем мероприятия")
    public CityDto nearest(@RequestParam double lat, @RequestParam double lng) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw ApiException.badRequest("Некорректные координаты");
        }
        return cityRepository.findNearest(lat, lng).map(CityDto::from)
                .orElseThrow(() -> ApiException.notFound("Справочник городов пуст"));
    }
}
