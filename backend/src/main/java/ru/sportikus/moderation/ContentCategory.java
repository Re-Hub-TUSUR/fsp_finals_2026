package ru.sportikus.moderation;

/** Категории, по которым фильтр поднимает сомнение. */
public enum ContentCategory {
    POLITICS("политика"),
    ALCOHOL("алкоголь"),
    TOBACCO("табак и никотин"),
    DRUGS("наркотики и допинг"),
    GAMBLING("азартные игры и ставки"),
    DISCRIMINATION("дискриминация и ненависть"),
    VIOLENCE("насилие и экстремизм"),
    ADULT("контент 18+"),
    FRAUD("финансовые схемы и спам"),
    PROFANITY("нецензурная лексика"),
    /** Не запрещённое слово, а неочевидная тематика: свой вид спорта или категория «Другое». */
    TOPIC("тематика под вопросом");

    private final String label;

    ContentCategory(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
