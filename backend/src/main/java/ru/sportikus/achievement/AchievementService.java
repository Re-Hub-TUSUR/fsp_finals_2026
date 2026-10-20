package ru.sportikus.achievement;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AchievementService {
    private final NamedParameterJdbcTemplate jdbc;

    /** Определение достижения: метрика из METRICS_SQL (или «achievements») и порог. */
    private record Def(String code, String title, String description, String icon, String metric, long target) {
        AchievementDto toDto(long progress) {
            return new AchievementDto(code, title, description, icon, Math.min(progress, target), target, progress >= target);
        }
    }

    private static final List<Def> DEFS = List.of(
        new Def("first_start","Первый старт","Примите участие в 1 событии","🏁","events",1),
        new Def("regular","Вошёл во вкус","Примите участие в 3 событиях","🔥","events",3),
        new Def("active","Активист","Примите участие в 5 событиях","⚡","events",5),
        new Def("veteran","Ветеран площадки","Примите участие в 10 событиях","🎖️","events",10),
        new Def("legend","Легенда Sportikus","Примите участие в 25 событиях","🏆","events",25),
        new Def("marathoner","Марафонец","Примите участие в 10 событиях бега","🏃","running",10),
        new Def("runner_beginner","Первые километры","Примите участие в 1 событии бега","👟","running",1),
        new Def("runner_regular","На дистанции","Примите участие в 5 событиях бега","🥇","running",5),
        new Def("team_player","Командный игрок","Примите участие в 3 командных событиях","🤝","team",3),
        new Def("team_captain","Капитан команды","Примите участие в 10 командных событиях","🧢","team",10),
        new Def("social_1","Первое знакомство","Добавьте 1 друга","👋","friends",1),
        new Def("social_3","Своя компания","Добавьте 3 друзей","🙂","friends",3),
        new Def("social_5","Коммуникатор","Добавьте 5 друзей","💬","friends",5),
        new Def("social_10","Душа компании","Добавьте 10 друзей","🎉","friends",10),
        new Def("social_25","Сетевик","Добавьте 25 друзей","🌐","friends",25),
        new Def("creator_1","Инициатор","Создайте 1 событие","✨","created",1),
        new Def("creator_3","Организатор","Создайте 3 события","📋","created",3),
        new Def("creator_5","Продюсер спорта","Создайте 5 событий","🎬","created",5),
        new Def("creator_10","Мастер событий","Создайте 10 событий","🚀","created",10),
        new Def("creator_25","Директор движения","Создайте 25 событий","👑","created",25),
        new Def("archive_1","Финишная черта","Завершите 1 своё событие","✅","archived",1),
        new Def("archive_3","Довожу до конца","Завершите 3 своих события","📦","archived",3),
        new Def("archive_10","Надёжный организатор","Завершите 10 своих событий","🛡️","archived",10),
        new Def("sports_2","Пробую новое","Попробуйте 2 вида спорта","🧭","sports",2),
        new Def("sports_3","Разносторонний","Попробуйте 3 вида спорта","🎯","sports",3),
        new Def("sports_5","Универсал","Попробуйте 5 видов спорта","🌟","sports",5),
        new Def("sports_10","Спортивный полимат","Попробуйте 10 видов спорта","🧠","sports",10),
        new Def("achiever_5","Достигатор","Получите 5 достижений","🏅","achievements",5),
        new Def("achiever_10","Коллекционер","Получите 10 достижений","💎","achievements",10),
        new Def("achiever_20","Охотник за наградами","Получите 20 достижений","👑","achievements",20)
    );

    /** Все метрики пользователя одним запросом: участие, виды спорта, созданные события и друзья. */
    private static final String METRICS_SQL = """
            WITH mine AS (
                SELECT e.sport_id, lower(s.name) AS sport, lower(s.slug) AS slug
                FROM participations p
                JOIN events e ON e.id = p.event_id
                JOIN sports s ON s.id = e.sport_id
                WHERE p.user_id = :u AND p.status = 'CONFIRMED'
            ), own AS (
                SELECT e.status
                FROM events e LEFT JOIN organizations o ON o.id = e.organizer_org_id
                WHERE e.organizer_user_id = :u OR o.owner_user_id = :u
            )
            SELECT (SELECT count(*) FROM mine) AS events,
                   (SELECT count(*) FROM mine WHERE sport LIKE '%бег%' OR slug LIKE '%run%') AS running,
                   (SELECT count(*) FROM mine WHERE sport ~ '(футбол|волейбол|баскетбол|хоккей)') AS team,
                   (SELECT count(DISTINCT sport_id) FROM mine) AS sports,
                   (SELECT count(*) FROM own) AS created,
                   (SELECT count(*) FROM own WHERE status = 'ARCHIVED') AS archived,
                   (SELECT count(*) FROM friendships
                    WHERE status = 'ACCEPTED' AND (requester_id = :u OR recipient_id = :u)) AS friends
            """;

    private static final String META_METRIC = "achievements";

    @Transactional(readOnly = true)
    public List<AchievementDto> forUser(Long userId) {
        Map<String, Object> row = jdbc.queryForMap(METRICS_SQL, Map.of("u", userId));
        List<AchievementDto> result = new ArrayList<>();
        long completed = 0;
        for (Def d : DEFS) {
            if (d.metric.equals(META_METRIC)) continue;
            long progress = ((Number) row.get(d.metric)).longValue();
            if (progress >= d.target) completed++;
            result.add(d.toDto(progress));
        }
        // «Достижения за достижения» считаются по уже полученным остальным
        for (Def d : DEFS) {
            if (d.metric.equals(META_METRIC)) result.add(d.toDto(completed));
        }
        return result;
    }
}
