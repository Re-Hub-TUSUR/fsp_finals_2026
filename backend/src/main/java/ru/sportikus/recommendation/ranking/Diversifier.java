package ru.sportikus.recommendation.ranking;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

/**
 * Разнообразие выдачи: не больше maxInRow событий одного вида спорта подряд.
 * Жадно берём лучший оставшийся элемент, который не нарушает правило; если таких нет — лучший вообще.
 */
public final class Diversifier {

    private Diversifier() {
    }

    public static List<Scored> diversify(List<Scored> sortedByScore, int maxInRow, int limit) {
        LinkedList<Scored> pool = new LinkedList<>(sortedByScore);
        List<Scored> result = new ArrayList<>();
        while (!pool.isEmpty() && result.size() < limit) {
            Scored pick = null;
            for (Scored candidate : pool) {
                if (!breaksRun(result, candidate.sportId(), maxInRow)) {
                    pick = candidate;
                    break;
                }
            }
            if (pick == null) {
                pick = pool.getFirst();
            }
            pool.remove(pick);
            result.add(pick);
        }
        return result;
    }

    private static boolean breaksRun(List<Scored> result, long sportId, int maxInRow) {
        if (result.size() < maxInRow) {
            return false;
        }
        for (int i = result.size() - maxInRow; i < result.size(); i++) {
            if (result.get(i).sportId() != sportId) {
                return false;
            }
        }
        return true;
    }
}
