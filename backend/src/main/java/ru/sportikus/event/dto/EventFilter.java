package ru.sportikus.event.dto;

import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.SkillLevel;

import java.util.List;

/** Параметры каталога. Любое поле можно не указывать. */
public record EventFilter(
        List<String> sportSlugs,
        String query,
        SkillLevel skillLevel,
        JoinMode joinMode,
        String templateCode,
        Double lat,
        Double lng,
        Double radiusKm
) {
}
