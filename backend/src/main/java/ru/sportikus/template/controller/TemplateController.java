package ru.sportikus.template.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.template.dto.TemplateDto;
import ru.sportikus.template.repository.TemplateRepository;

import java.util.List;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
@Tag(name = "Templates", description = "Конструктор мероприятий: готовые шаблоны с настраиваемыми полями")
public class TemplateController {

    private final TemplateRepository templateRepository;

    @GetMapping
    @Operation(summary = "Шаблоны мероприятий (поля, значения по умолчанию, вопросы участнику)")
    public List<TemplateDto> list() {
        return templateRepository.findByActiveTrueOrderBySortOrderAscIdAsc().stream().map(TemplateDto::from).toList();
    }
}
