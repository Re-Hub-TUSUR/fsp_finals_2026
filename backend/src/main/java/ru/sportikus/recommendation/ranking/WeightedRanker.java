package ru.sportikus.recommendation.ranking;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.preference.model.PreferredTime;
import ru.sportikus.recommendation.RecommendationProperties;
import ru.sportikus.recommendation.dto.RecommendationResponse.Reason;
import ru.sportikus.recommendation.signal.AffinityKind;
import ru.sportikus.recommendation.signal.UserSignals;
import ru.sportikus.recommendation.source.RecommendationContext;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Взвешенная сумма нормированных (0..1) признаков минус штраф за отвергнутое.
 * Каждый признак, внёсший заметный вклад, превращается в понятную пользователю причину.
 */
@Component
@RequiredArgsConstructor
public class WeightedRanker implements Ranker {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMMM", Locale.forLanguageTag("ru"));
    private static final String DEFAULT_ZONE = "Europe/Moscow";

    private final RecommendationProperties props;

    @Override
    public String model() {
        return "weighted-v1";
    }

    private record Part(String feature, double weight, double value, Reason reason) {
        double contribution() {
            return weight * value;
        }
    }

    @Override
    public Scored score(CandidateView c, RecommendationContext ctx) {
        RecommendationProperties.Weights w = props.getWeights();
        UserSignals s = ctx.signals();
        Event e = c.event();
        long sportId = e.getSport().getId();
        String sportName = e.getSport().getName();
        ZoneId zone = ZoneId.of(e.getTimeZone() == null ? DEFAULT_ZONE : e.getTimeZone());
        ZonedDateTime localStart = e.getStartTime().atZone(zone);
        List<Part> parts = new ArrayList<>();

        // 1. Интересы: явные — полный вес, похожие по поведению других пользователей — частичный
        if (s.interests().contains(sportId)) {
            parts.add(new Part("interest", w.getInterest(), 1.0, new Reason("INTEREST", "Вы интересуетесь: " + sportName)));
        } else if (s.similarSports().containsKey(sportId)) {
            UserSignals.Similar sim = s.similarSports().get(sportId);
            String via = ctx.sportNames().getOrDefault(sim.viaSportId(), "похожим");
            parts.add(new Part("interest", w.getInterest(), 0.4 + 0.4 * Math.min(1, sim.score()),
                    new Reason("SIMILAR", "Тем, кто любит «" + via + "», нравится «" + sportName + "»")));
        }

        // 2. Накопленный интерес: куда пользователь реально ходит
        double sportAff = s.affinity(AffinityKind.SPORT, sportId);
        double templateAff = e.getTemplate() == null ? 0 : s.affinity(AffinityKind.TEMPLATE, e.getTemplate().getId());
        double affinity = 0.7 * Math.tanh(Math.max(0, sportAff) / 2) + 0.3 * Math.tanh(Math.max(0, templateAff));
        if (affinity > 0) {
            parts.add(new Part("affinity", w.getAffinity(), affinity,
                    sportAff > 0.3 ? new Reason("HISTORY", "Вы уже ходили на «" + sportName + "»") : null));
        }

        // 3. Знакомый организатор
        double orgAff = e.getOrganizerOrg() != null
                ? s.affinity(AffinityKind.ORGANIZATION, e.getOrganizerOrg().getId())
                : s.affinity(AffinityKind.ORGANIZER_USER, e.getOrganizerUser() == null ? null : e.getOrganizerUser().getId());
        if (orgAff > 0) {
            parts.add(new Part("organizer", w.getOrganizer(), Math.tanh(orgAff),
                    orgAff > 0.2 ? new Reason("ORGANIZER", "Вы уже были у организатора «" + c.response().organizerName() + "»") : null));
        }

        // 4. Расстояние: экспоненциальное затухание, масштаб — половина радиуса поиска
        double distance = Math.exp(-c.distanceKm() / Math.max(0.5, ctx.radiusKm() / 2));
        parts.add(new Part("distance", w.getDistance(), distance,
                c.distanceKm() <= ctx.radiusKm() / 2 ? new Reason("NEAR", formatDistance(c.distanceKm())) : null));

        // 5. Скоро начнётся
        double hours = Math.max(0, Duration.between(ctx.now(), e.getStartTime()).toMinutes() / 60.0);
        parts.add(new Part("urgency", w.getUrgency(), Math.exp(-hours / 96),
                hours <= 48 ? new Reason("SOON", formatStart(localStart, ctx.now().atZone(zone).toLocalDate())) : null));

        // 6. Уровень подготовки
        double skill = skillMatch(s.skillLevel(), e.getSkillLevel());
        parts.add(new Part("skill", w.getSkill(), skill,
                s.skillLevel() != null && skill >= 1.0 ? new Reason("SKILL", "Подходит вашему уровню") : null));

        // 7. Удобное время — в местном часовом поясе события
        TimeMatch time = timeMatch(s, localStart);
        parts.add(new Part("time", w.getTime(), time.value(), time.reason()));

        // 8. Социальное доказательство: популярность и заполненность
        double fill = c.response().capacity() == 0 ? 0 : (double) c.response().confirmedCount() / c.response().capacity();
        double social = 0.7 * c.popularity() / (c.popularity() + 5) + 0.3 * fill;
        parts.add(new Part("social", w.getSocial(), social, c.response().confirmedCount() >= 3
                ? new Reason("POPULAR", "Уже идут " + c.response().confirmedCount() + " " + people(c.response().confirmedCount()))
                : null));

        // Штраф: виды спорта и организаторы, от которых пользователь отказывался
        double penalty = w.getDislikePenalty() * Math.tanh(Math.max(0, -sportAff) + Math.max(0, -orgAff));

        double score = parts.stream().mapToDouble(Part::contribution).sum() - penalty;
        Map<String, Double> breakdown = new LinkedHashMap<>();
        parts.forEach(p -> breakdown.merge(p.feature(), round(p.contribution()), Double::sum));
        if (penalty > 0) {
            breakdown.put("penalty", round(-penalty));
        }

        List<Reason> reasons = new ArrayList<>(parts.stream()
                .filter(p -> p.reason() != null && p.contribution() > 0.01)
                .sorted(Comparator.comparingDouble(Part::contribution).reversed())
                .limit(3)
                .map(Part::reason)
                .toList());
        int left = c.response().capacity() - c.response().confirmedCount();
        if (left > 0 && left <= 3) {
            reasons.add(new Reason("SPOTS", "Осталось мест: " + left));
        }
        return new Scored(c, round(score), reasons, breakdown);
    }

    static double skillMatch(SkillLevel user, SkillLevel event) {
        if (event == null || event == SkillLevel.ANY) {
            return 0.8;
        }
        if (user == null || user == SkillLevel.ANY) {
            return 0.5;
        }
        int diff = Math.abs(user.ordinal() - event.ordinal());
        return diff == 0 ? 1.0 : diff == 1 ? 0.4 : 0.0;
    }

    private record TimeMatch(double value, Reason reason) {
    }

    private static TimeMatch timeMatch(UserSignals s, ZonedDateTime local) {
        PreferredTime part = PreferredTime.partOfDay(local);
        boolean weekend = PreferredTime.isWeekend(local);
        if (!s.preferredTimes().isEmpty()) {
            if (weekend && s.preferredTimes().contains(PreferredTime.WEEKEND)) {
                return new TimeMatch(1, new Reason("TIME", "В удобное время: выходные"));
            }
            if (part != null && s.preferredTimes().contains(part)) {
                return new TimeMatch(1, new Reason("TIME", "В удобное время: " + part.label()));
            }
            return new TimeMatch(0, null);
        }
        // Явных предпочтений нет — смотрим, в какое время пользователь обычно ходит
        double slot = s.affinity(AffinityKind.TIME_SLOT, PreferredTime.slotId(part));
        double weekendAff = weekend ? s.affinity(AffinityKind.TIME_SLOT, PreferredTime.slotId(PreferredTime.WEEKEND)) : 0;
        return new TimeMatch(0.5 + 0.5 * Math.tanh(Math.max(slot, weekendAff)), null);
    }

    static String formatDistance(double km) {
        if (km < 1) {
            return Math.max(50, Math.round(km * 1000 / 50) * 50) + " м от вас";
        }
        return String.format(Locale.forLanguageTag("ru"), "%.1f км от вас", km);
    }

    static String formatStart(ZonedDateTime start, LocalDate today) {
        LocalDate day = start.toLocalDate();
        String d = day.equals(today) ? "Сегодня" : day.equals(today.plusDays(1)) ? "Завтра" : day.format(DAY);
        return d + " в " + start.format(TIME);
    }

    private static String people(int n) {
        int mod100 = n % 100;
        int mod10 = n % 10;
        return (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) ? "человека" : "человек";
    }

    private static double round(double v) {
        return Math.round(v * 1000) / 1000.0;
    }
}
