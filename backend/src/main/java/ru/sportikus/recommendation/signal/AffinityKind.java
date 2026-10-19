package ru.sportikus.recommendation.signal;

/**
 * Устойчивые сущности, к которым копится интерес пользователя. Сами события живут несколько дней,
 * поэтому учиться на конкретных событиях бессмысленно — учимся на том, что повторяется.
 */
public enum AffinityKind {
    SPORT(1.0),
    TEMPLATE(0.5),
    ORGANIZATION(0.7),
    ORGANIZER_USER(0.7),
    TIME_SLOT(0.3);

    /** Доля базового веса действия, которая достаётся этой сущности. */
    private final double share;

    AffinityKind(double share) {
        this.share = share;
    }

    public double share() {
        return share;
    }
}
