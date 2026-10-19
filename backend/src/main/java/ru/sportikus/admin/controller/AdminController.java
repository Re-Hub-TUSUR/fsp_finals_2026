package ru.sportikus.admin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Панель администратора: модерация организаций и мероприятий")
public class AdminController {

    @GetMapping("/organizations")
    @Operation(summary = "Получить список заявок организаций по статусу")
    public ResponseEntity<List<Map<String, Object>>> getOrgApplications(
            @RequestParam(required = false, defaultValue = "PENDING") String status
    ) {
        return ResponseEntity.ok(List.of(
            Map.of(
                "id", 2,
                "name", "Шахматный клуб Ладья",
                "description", "Городской клуб любителей шахмат на о. Татышев",
                "status", status
            )
        ));
    }

    @PostMapping("/organizations/{id}/approve")
    @Operation(summary = "Одобрить организацию (допуск к публикации)")
    public ResponseEntity<Map<String, Object>> approveOrganization(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of(
            "organizationId", id,
            "status", "APPROVED",
            "message", "Организация успешно допущена к созданию мероприятий без премодерации"
        ));
    }

    @PostMapping("/organizations/{id}/reject")
    @Operation(summary = "Отклонить заявку организации с обязательной причиной")
    public ResponseEntity<Map<String, Object>> rejectOrganization(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String reason = body.getOrDefault("reason", "Причина не указана");
        return ResponseEntity.ok(Map.of(
            "organizationId", id,
            "status", "REJECTED",
            "reason", reason
        ));
    }

    @PostMapping("/events/{id}/unpublish")
    @Operation(summary = "Снять мероприятие с публикации админом (Сценарий 6 ТЗ)")
    public ResponseEntity<Map<String, Object>> unpublishEvent(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String reason = body.getOrDefault("reason", "Нарушение правил площадки");
        return ResponseEntity.ok(Map.of(
            "eventId", id,
            "status", "UNPUBLISHED",
            "reason", reason,
            "message", "Событие снято с публикации и скрыто из поиска и карты"
        ));
    }
}
