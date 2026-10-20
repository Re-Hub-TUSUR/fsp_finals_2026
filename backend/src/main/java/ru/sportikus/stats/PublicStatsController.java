package ru.sportikus.stats;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.organization.repository.OrganizationRepository;
import ru.sportikus.sport.repository.SportRepository;
import ru.sportikus.user.repository.UserRepository;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/public/stats")
@RequiredArgsConstructor
@Tag(name = "Public", description = "Данные для приветственной страницы (без входа)")
public class PublicStatsController {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final SportRepository sportRepository;
    private final OrganizationRepository organizationRepository;

    @GetMapping
    @Operation(summary = "Сводка платформы: предстоящие встречи, спортсмены, виды спорта, одобренные организации")
    public PublicStatsDto get() {
        return new PublicStatsDto(
                eventRepository.countByStatusAndStartTimeAfter(EventStatus.PUBLISHED, Instant.now()),
                userRepository.countByRole("ROLE_USER"),
                sportRepository.count(),
                organizationRepository.countByStatus("APPROVED"));
    }
}
