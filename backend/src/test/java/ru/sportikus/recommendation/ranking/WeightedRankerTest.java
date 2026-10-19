package ru.sportikus.recommendation.ranking;

import org.junit.jupiter.api.Test;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.recommendation.RecommendationProperties;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.preference.model.PreferredTime;
import ru.sportikus.recommendation.dto.RecommendationResponse.Reason;




import ru.sportikus.recommendation.signal.AffinityKind;
import ru.sportikus.recommendation.signal.UserSignals;
import ru.sportikus.recommendation.source.RecommendationContext;
import ru.sportikus.sport.model.Sport;
import ru.sportikus.user.model.User;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class WeightedRankerTest {

    private static final Instant NOW = Instant.parse("2026-10-19T03:00:00Z");
    private final WeightedRanker ranker = new WeightedRanker(new RecommendationProperties());

    private static final Sport RUN = Sport.builder().id(1L).name("Бег").build();
    private static final Sport BIKE = Sport.builder().id(2L).name("Велоспорт").build();
    private static final Sport CHESS = Sport.builder().id(3L).name("Шахматы").build();

    private static CandidateView candidate(long id, Sport sport, double distanceKm, Instant start, String zone) {
        User organizer = User.builder().id(100L).fullName("Организатор").build();
        Event e = Event.builder().id(id).title("Событие " + id).sport(sport).organizerUser(organizer)
                .startTime(start).endTime(start.plus(2, ChronoUnit.HOURS)).timeZone(zone)
                .capacity(10).joinMode(JoinMode.OPEN).skillLevel(SkillLevel.AMATEUR).build();
        EventResponse r = new EventResponse(id, e.getTitle(), null, null, null, "Организатор", null, false, null, 100L,
                start, e.getEndTime(), 56.0, 92.9, "адрес", "Красноярск", zone, 10, 1, JoinMode.OPEN, SkillLevel.AMATEUR,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
        return new CandidateView(e, r, distanceKm, 0, Set.of("INTEREST"));
    }

    private static UserSignals signals(Set<Long> interests, Map<Long, UserSignals.Similar> similar,
                                       Map<AffinityKind, Map<Long, Double>> aff, List<PreferredTime> times) {
        return new UserSignals(1L, interests, similar, aff, SkillLevel.AMATEUR, times, null, null, 25);
    }

    private static RecommendationContext ctx(UserSignals s) {
        return new RecommendationContext(1L, 56.0, 92.9, 25, 30, NOW, s, Map.of(1L, "Бег"));
    }

    @Test
    void explicitInterestBeatsUnrelatedSportAtSameDistanceAndTime() {
        Instant start = NOW.plus(1, ChronoUnit.DAYS);
        UserSignals s = signals(Set.of(1L), Map.of(), new EnumMap<>(AffinityKind.class), List.of());
        Scored run = ranker.score(candidate(1, RUN, 2, start, "Asia/Krasnoyarsk"), ctx(s));
        Scored chess = ranker.score(candidate(2, CHESS, 2, start, "Asia/Krasnoyarsk"), ctx(s));

        assertThat(run.score()).isGreaterThan(chess.score());
        assertThat(run.reasons()).extracting(Reason::code).contains("INTEREST");
        assertThat(run.breakdown()).containsKeys("interest", "distance", "urgency");
    }

    @Test
    void similarSportGetsPartialCreditWithExplanation() {
        Instant start = NOW.plus(1, ChronoUnit.DAYS);
        UserSignals s = signals(Set.of(1L), Map.of(2L, new UserSignals.Similar(0.8, 1L)),
                new EnumMap<>(AffinityKind.class), List.of());
        Scored bike = ranker.score(candidate(1, BIKE, 2, start, "Asia/Krasnoyarsk"), ctx(s));
        Scored run = ranker.score(candidate(2, RUN, 2, start, "Asia/Krasnoyarsk"), ctx(s));
        Scored chess = ranker.score(candidate(3, CHESS, 2, start, "Asia/Krasnoyarsk"), ctx(s));

        assertThat(bike.score()).isBetween(chess.score(), run.score());
        assertThat(bike.reasons()).anySatisfy(r -> assertThat(r.text()).contains("«Бег»").contains("«Велоспорт»"));
    }

    @Test
    void closerAndSoonerEventsRankHigher() {
        UserSignals s = signals(Set.of(1L), Map.of(), new EnumMap<>(AffinityKind.class), List.of());
        Instant soon = NOW.plus(1, ChronoUnit.DAYS);
        assertThat(ranker.score(candidate(1, RUN, 1, soon, "Asia/Krasnoyarsk"), ctx(s)).score())
                .isGreaterThan(ranker.score(candidate(2, RUN, 20, soon, "Asia/Krasnoyarsk"), ctx(s)).score());
        assertThat(ranker.score(candidate(3, RUN, 5, soon, "Asia/Krasnoyarsk"), ctx(s)).score())
                .isGreaterThan(ranker.score(candidate(4, RUN, 5, NOW.plus(20, ChronoUnit.DAYS), "Asia/Krasnoyarsk"), ctx(s)).score());
    }

    @Test
    void dismissedSportIsPenalized() {
        Instant start = NOW.plus(1, ChronoUnit.DAYS);
        Map<AffinityKind, Map<Long, Double>> aff = new EnumMap<>(AffinityKind.class);
        aff.put(AffinityKind.SPORT, Map.of(3L, -1.0));
        UserSignals s = signals(Set.of(), Map.of(), aff, List.of());
        Scored chess = ranker.score(candidate(1, CHESS, 2, start, "Asia/Krasnoyarsk"), ctx(s));
        Scored neutral = ranker.score(candidate(2, BIKE, 2, start, "Asia/Krasnoyarsk"), ctx(s));
        assertThat(chess.score()).isLessThan(neutral.score());
        assertThat(chess.breakdown()).containsKey("penalty");
    }

    @Test
    void preferredTimeIsEvaluatedInEventLocalTimeZone() {
        // 12:00 UTC = 19:00 в Красноярске (вечер), но 15:00 в Москве (день)
        Instant start = Instant.parse("2026-10-20T12:00:00Z");
        UserSignals s = signals(Set.of(1L), Map.of(), new EnumMap<>(AffinityKind.class), List.of(PreferredTime.EVENING));
        Scored krasnoyarsk = ranker.score(candidate(1, RUN, 2, start, "Asia/Krasnoyarsk"), ctx(s));
        Scored moscow = ranker.score(candidate(2, RUN, 2, start, "Europe/Moscow"), ctx(s));
        assertThat(krasnoyarsk.breakdown().get("time")).isGreaterThan(moscow.breakdown().get("time"));
    }

    @Test
    void helpers() {
        assertThat(WeightedRanker.formatDistance(0.43)).isEqualTo("450 м от вас");
        assertThat(WeightedRanker.formatDistance(3.26)).isEqualTo("3,3 км от вас");
        ZonedDateTime start = ZonedDateTime.of(2026, 10, 20, 19, 0, 0, 0, ZoneId.of("Asia/Krasnoyarsk"));
        assertThat(WeightedRanker.formatStart(start, LocalDate.of(2026, 10, 19))).isEqualTo("Завтра в 19:00");
        assertThat(WeightedRanker.formatStart(start, LocalDate.of(2026, 10, 20))).isEqualTo("Сегодня в 19:00");
    }

    @Test
    void diversifierLimitsSameSportRuns() {
        UserSignals s = signals(Set.of(1L), Map.of(), new EnumMap<>(AffinityKind.class), List.of());
        List<Scored> sorted = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            sorted.add(ranker.score(candidate(i, RUN, 1 + i, NOW.plus(1, ChronoUnit.DAYS), "Asia/Krasnoyarsk"), ctx(s)));
        }
        sorted.add(ranker.score(candidate(10, CHESS, 1, NOW.plus(1, ChronoUnit.DAYS), "Asia/Krasnoyarsk"), ctx(s)));

        List<Scored> result = Diversifier.diversify(sorted, 2, 5);
        assertThat(result).extracting(Scored::sportId).containsExactly(1L, 1L, 3L, 1L, 1L);
    }

    @Test
    void partOfDayBoundaries() {
        ZoneId z = ZoneId.of("Asia/Vladivostok");
        assertThat(PreferredTime.partOfDay(ZonedDateTime.of(2026, 10, 24, 7, 0, 0, 0, z))).isEqualTo(PreferredTime.MORNING);
        assertThat(PreferredTime.partOfDay(ZonedDateTime.of(2026, 10, 24, 12, 0, 0, 0, z))).isEqualTo(PreferredTime.DAY);
        assertThat(PreferredTime.partOfDay(ZonedDateTime.of(2026, 10, 24, 18, 0, 0, 0, z))).isEqualTo(PreferredTime.EVENING);
        assertThat(PreferredTime.partOfDay(ZonedDateTime.of(2026, 10, 24, 2, 0, 0, 0, z))).isNull();
        assertThat(PreferredTime.isWeekend(ZonedDateTime.of(2026, 10, 24, 12, 0, 0, 0, z))).isTrue();
    }
}
