package ru.sportikus.common;

/** Нормализация необязательных текстовых полей из запросов. */
public final class Strings {

    private Strings() {
    }

    /** Пустую или пробельную строку превращает в null, остальное — обрезает по краям. */
    public static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
