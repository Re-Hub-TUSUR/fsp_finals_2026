package ru.sportikus.sport.dto;

import ru.sportikus.sport.model.Sport;

public record SportDto(Long id, String name, String slug, boolean custom) {

    public static SportDto from(Sport sport) {
        return new SportDto(sport.getId(), sport.getName(), sport.getSlug(), Boolean.TRUE.equals(sport.getIsCustom()));
    }
}
