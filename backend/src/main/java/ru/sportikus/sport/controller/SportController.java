package ru.sportikus.sport.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.sport.dto.SportDto;
import ru.sportikus.sport.repository.SportRepository;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sports")
@RequiredArgsConstructor
@Tag(name = "Sports", description = "Справочник видов спорта и активностей")
public class SportController {

    private final SportRepository sportRepository;

    @GetMapping
    @Operation(summary = "Все виды спорта, включая добавленные пользователями")
    public List<SportDto> list() {
        return sportRepository.findAllByOrderByNameAsc().stream().map(SportDto::from).toList();
    }
}
