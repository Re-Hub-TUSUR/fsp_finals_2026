package ru.sportikus.event.repository;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import ru.sportikus.event.dto.EventFilter;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.model.SkillLevel;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class EventSpecs {

    private EventSpecs() {
    }

    /** Публичный каталог: опубликованные и ещё не закончившиеся мероприятия + пользовательские фильтры. */
    public static Specification<Event> catalog(EventFilter f, Instant now) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.equal(root.get("status"), EventStatus.PUBLISHED));
            p.add(cb.greaterThan(root.get("endTime"), now));

            if (f.sportSlugs() != null && !f.sportSlugs().isEmpty()) {
                p.add(root.get("sport").get("slug").in(f.sportSlugs()));
            }
            if (f.query() != null && !f.query().isBlank()) {
                String like = "%" + f.query().trim().toLowerCase() + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("address")), like),
                        cb.like(cb.lower(root.get("description")), like)));
            }
            if (f.skillLevel() != null && f.skillLevel() != SkillLevel.ANY) {
                p.add(root.get("skillLevel").in(f.skillLevel(), SkillLevel.ANY));
            }
            if (f.joinMode() != null) {
                p.add(cb.equal(root.get("joinMode"), f.joinMode()));
            }
            if (f.templateCode() != null && !f.templateCode().isBlank()) {
                p.add(cb.equal(root.join("template", JoinType.LEFT).get("code"), f.templateCode()));
            }
            return cb.and(p.toArray(new Predicate[0]));
        };
    }
}
