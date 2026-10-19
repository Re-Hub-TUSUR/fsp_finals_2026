package ru.sportikus.achievement;

public record AchievementDto(String code, String title, String description, String icon,
                             long progress, long target, boolean completed) { }
