package ru.sportikus.organization.model;

/** Статус заявки организации: значения колонки organizations.status и поля status в API. */
public final class OrganizationStatus {

    /** Ждёт решения администратора. */
    public static final String PENDING = "PENDING";
    /** Одобрена — публикует мероприятия без премодерации. */
    public static final String APPROVED = "APPROVED";
    public static final String REJECTED = "REJECTED";

    private OrganizationStatus() {
    }
}
