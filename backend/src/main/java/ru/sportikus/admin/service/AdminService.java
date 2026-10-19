package ru.sportikus.admin.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.admin.dto.AdminOrgDto;
import ru.sportikus.common.ApiException;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.service.EventMapper;
import ru.sportikus.moderation.ModerationStatus;
import ru.sportikus.organization.model.Organization;
import ru.sportikus.organization.repository.OrganizationRepository;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final OrganizationRepository organizationRepository;
    private final EventRepository eventRepository;
    private final EventMapper eventMapper;

    @Transactional(readOnly = true)
    public List<AdminOrgDto> organizations(String status) {
        List<Organization> orgs = status == null || status.isBlank()
                ? organizationRepository.findAllByOrderByCreatedAtDesc()
                : organizationRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        return orgs.stream().map(AdminOrgDto::from).toList();
    }

    @Transactional
    public AdminOrgDto approve(Long id) {
        Organization org = findOrg(id);
        org.setStatus("APPROVED");
        org.setRejectReason(null);
        return AdminOrgDto.from(org);
    }

    @Transactional
    public AdminOrgDto reject(Long id, String reason) {
        Organization org = findOrg(id);
        org.setStatus("REJECTED");
        org.setRejectReason(reason.trim());
        return AdminOrgDto.from(org);
    }

    /** Все мероприятия с результатом автопроверки; требующие внимания (⚠) — первыми. */
    @Transactional(readOnly = true)
    public List<EventResponse> events() {
        List<Event> events = eventRepository.findAllByOrderByStartTimeDesc().stream()
                .sorted(Comparator.comparingInt(AdminService::attentionRank))
                .toList();
        return eventMapper.toList(events, null, false, true);
    }

    @Transactional
    public EventResponse unpublish(Long id, String reason) {
        Event event = findEvent(id);
        event.setStatus(EventStatus.UNPUBLISHED);
        event.setUnpublishReason(reason.trim());
        return eventMapper.toDetails(event, null, true);
    }

    /** Вернуть в публикацию. Ручное решение администратора перекрывает автопроверку. */
    @Transactional
    public EventResponse publish(Long id) {
        Event event = findEvent(id);
        event.setStatus(EventStatus.PUBLISHED);
        event.setUnpublishReason(null);
        if (event.getModerationStatus() != ModerationStatus.CLEAN) {
            markReviewed(event);
        }
        return eventMapper.toDetails(event, null, true);
    }

    /** Снять пометку ⚠: администратор посмотрел мероприятие и оставляет его. */
    @Transactional
    public EventResponse reviewed(Long id) {
        Event event = findEvent(id);
        if (event.getModerationStatus() != ModerationStatus.FLAGGED) {
            throw ApiException.conflict("Пометку можно снять только с мероприятия, отмеченного автопроверкой");
        }
        markReviewed(event);
        return eventMapper.toDetails(event, null, true);
    }

    private static void markReviewed(Event event) {
        event.setModerationStatus(ModerationStatus.REVIEWED);
        event.setModeratedAt(Instant.now());
    }

    /** Порядок в списке: помеченные ИИ, отклонённые ИИ, на проверке, остальные. */
    private static int attentionRank(Event e) {
        return switch (e.getModerationStatus()) {
            case FLAGGED -> 0;
            case REJECTED -> 1;
            case PENDING -> 2;
            default -> 3;
        };
    }

    private Organization findOrg(Long id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Организация не найдена"));
    }

    private Event findEvent(Long id) {
        return eventRepository.findDetailedById(id)
                .orElseThrow(() -> ApiException.notFound("Мероприятие не найдено"));
    }
}
