package ru.sportikus.recommendation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.recommendation.dto.FeedbackRequest;
import ru.sportikus.recommendation.dto.RecommendationResponse;
import ru.sportikus.recommendation.service.RecommendationService;
import ru.sportikus.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommendations", description = "Персональные рекомендации мероприятий")
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping
    @Operation(summary = "Рекомендованные мероприятия",
            description = "lat/lng — геолокация устройства (необязательно; иначе — дом или домашний город из профиля). "
                    + "Каждый элемент содержит причины и вклад признаков в итоговый балл.")
    public RecommendationResponse recommend(@RequestParam(required = false) Double lat,
                                            @RequestParam(required = false) Double lng,
                                            @RequestParam(required = false) Integer limit) {
        return recommendationService.recommend(CurrentUser.require().id(), lat, lng, limit);
    }

    @PostMapping("/feedback")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Реакция на рекомендацию: CLICK (открыл) или DISMISS («Не интересно»)")
    public void feedback(@Valid @RequestBody FeedbackRequest request) {
        recommendationService.feedback(CurrentUser.require().id(), request);
    }

    @DeleteMapping("/feedback/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Отменить «Не интересно»")
    public void undoDismiss(@PathVariable Long eventId) {
        recommendationService.undoDismiss(CurrentUser.require().id(), eventId);
    }
}
