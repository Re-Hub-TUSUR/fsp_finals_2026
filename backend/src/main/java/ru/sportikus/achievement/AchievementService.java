package ru.sportikus.achievement;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AchievementService {
    private final JdbcTemplate jdbc;

    private record Def(String code, String title, String description, String icon, String metric, long target) {}

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

    public List<AchievementDto> forUser(Long userId) {
        long events = count("select count(*) from participations where user_id=? and status='CONFIRMED'", userId);
        long running = count("select count(*) from participations p join events e on e.id=p.event_id join sports s on s.id=e.sport_id where p.user_id=? and p.status='CONFIRMED' and (lower(s.name) like '%бег%' or lower(s.slug) like '%run%')", userId);
        long team = count("select count(*) from participations p join events e on e.id=p.event_id join sports s on s.id=e.sport_id where p.user_id=? and p.status='CONFIRMED' and lower(s.name) ~ '(футбол|волейбол|баскетбол|хоккей)'", userId);
        long friends = count("select count(*) from friendships where status='ACCEPTED' and (requester_id=? or recipient_id=?)", userId, userId);
        long created = count("select count(*) from events e left join organizations o on o.id=e.organizer_org_id where e.organizer_user_id=? or o.owner_user_id=?", userId, userId);
        long archived = count("select count(*) from events e left join organizations o on o.id=e.organizer_org_id where e.status='ARCHIVED' and (e.organizer_user_id=? or o.owner_user_id=?)", userId, userId);
        long sports = count("select count(distinct e.sport_id) from participations p join events e on e.id=p.event_id where p.user_id=? and p.status='CONFIRMED'", userId);
        var values = java.util.Map.of("events",events,"running",running,"team",team,"friends",friends,"created",created,"archived",archived,"sports",sports);
        List<AchievementDto> result = new ArrayList<>();
        long completed = 0;
        for (Def d : DEFS) if (!d.metric.equals("achievements")) { long p=values.get(d.metric); boolean done=p>=d.target; if(done) completed++; result.add(new AchievementDto(d.code,d.title,d.description,d.icon,Math.min(p,d.target),d.target,done)); }
        for (Def d : DEFS) if (d.metric.equals("achievements")) result.add(new AchievementDto(d.code,d.title,d.description,d.icon,Math.min(completed,d.target),d.target,completed>=d.target));
        return result;
    }

    private long count(String sql, Object... args) { Long value=jdbc.queryForObject(sql, Long.class, args); return value == null ? 0 : value; }
}
