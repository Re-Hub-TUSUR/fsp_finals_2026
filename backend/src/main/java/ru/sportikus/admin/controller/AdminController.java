package ru.sportikus.admin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.sportikus.admin.dto.AdminOrgDto;
import ru.sportikus.admin.dto.ReasonRequest;
import ru.sportikus.admin.service.AdminService;
import ru.sportikus.event.dto.EventResponse;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Панель администратора: модерация организаций и мероприятий")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/organizations")
    @Operation(summary = "Организации (опционально по статусу PENDING / APPROVED / REJECTED)")
    public List<AdminOrgDto> organizations(@RequestParam(required = false) String status) {
        return adminService.organizations(status);
    }

    @PostMapping("/organizations/{id}/approve")
    @Operation(summary = "Допустить организацию к публикации мероприятий")
    public AdminOrgDto approve(@PathVariable Long id) {
        return adminService.approve(id);
    }

    @PostMapping("/organizations/{id}/reject")
    @Operation(summary = "Отклонить организацию с обязательной причиной")
    public AdminOrgDto reject(@PathVariable Long id, @Valid @RequestBody ReasonRequest request) {
        return adminService.reject(id, request.reason());
    }

    @GetMapping("/events")
    @Operation(summary = "Все мероприятия, включая снятые с публикации",
            description = "С результатом автопроверки (`moderation`). Первыми идут требующие внимания: "
                    + "`FLAGGED` (⚠ сомнительное, ИИ пропустил или был недоступен), затем `REJECTED` (отклонено ИИ) и `PENDING`.")
    public List<EventResponse> events() {
        return adminService.events();
    }

    @PostMapping("/events/{id}/moderation/reviewed")
    @Operation(summary = "Снять пометку автопроверки ⚠",
            description = "Администратор посмотрел мероприятие с `moderation.status = FLAGGED` и оставляет его в публикации. "
                    + "Чтобы убрать мероприятие, используйте снятие с публикации.")
    public EventResponse reviewed(@PathVariable Long id) {
        return adminService.reviewed(id);
    }

    @PostMapping("/events/{id}/unpublish")
    @Operation(summary = "Снять мероприятие с публикации с обязательной причиной")
    public EventResponse unpublish(@PathVariable Long id, @Valid @RequestBody ReasonRequest request) {
        return adminService.unpublish(id, request.reason());
    }

    @PostMapping("/events/{id}/publish")
    @Operation(summary = "Вернуть мероприятие в публикацию",
            description = "В том числе отклонённое автопроверкой: ручное решение администратора снимает результат проверки (REVIEWED).")
    public EventResponse publish(@PathVariable Long id) {
        return adminService.publish(id);
    }
}
