package ru.sportikus.city.dto;

import ru.sportikus.city.model.City;

public record CityDto(Long id, String name, String region, double lat, double lng, String timeZone) {

    public static CityDto from(City c) {
        return c == null ? null : new CityDto(c.getId(), c.getName(), c.getRegion(), c.getLat(), c.getLng(), c.getTimeZone());
    }
}
