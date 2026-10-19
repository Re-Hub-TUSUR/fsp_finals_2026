package ru.sportikus.moderation;

import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.OrgDetails;
import ru.sportikus.form.CustomField;
import ru.sportikus.form.FieldDef;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Весь пользовательский текст мероприятия, разложенный по полям: что проверяет фильтр
 * и что видит ИИ. Поле → значение, в порядке важности.
 */
public record ModerationText(Map<String, String> fields) {

    public static ModerationText of(Event e) {
        Map<String, String> f = new LinkedHashMap<>();
        put(f, "Название", e.getTitle());
        put(f, "Вид спорта", e.getSport() == null ? null : e.getSport().getName());
        put(f, "Формат", e.getTemplate() == null ? null : e.getTemplate().getName());
        put(f, "Описание", e.getDescription());
        put(f, "Что взять с собой", e.getRequiredEquipment());
        put(f, "Адрес", e.getAddress());

        Map<String, String> labels = e.getFields() == null ? Map.of() : e.getFields().stream()
                .collect(Collectors.toMap(FieldDef::key, FieldDef::label, (a, b) -> a));
        if (e.getDetails() != null) {
            e.getDetails().forEach((key, value) -> put(f, labels.getOrDefault(key, key), stringify(value)));
        }
        if (e.getCustomFields() != null) {
            for (CustomField c : e.getCustomFields()) {
                put(f, "Свой параметр «" + c.label() + "»", c.value());
            }
        }
        if (e.getRegistrationFields() != null && !e.getRegistrationFields().isEmpty()) {
            put(f, "Вопросы участникам", e.getRegistrationFields().stream()
                    .map(q -> q.label() + (q.options() == null ? "" : " (" + String.join(", ", q.options()) + ")"))
                    .collect(Collectors.joining("; ")));
        }
        OrgDetails o = e.getOrgDetails();
        if (o != null) {
            put(f, "Площадка", o.venueName());
            put(f, "Призы", o.prizes());
            put(f, "Партнёры", o.sponsors());
            put(f, "Условия отмены", o.cancellationPolicy());
            put(f, "Сайт", o.website());
            put(f, "Документы", join(o.requiredDocuments()));
            put(f, "Инфраструктура", join(o.facilities()));
            if (o.program() != null) {
                put(f, "Программа", o.program().stream()
                        .map(p -> (p.time() == null ? "" : p.time() + " ") + p.title())
                        .collect(Collectors.joining("; ")));
            }
        }
        return new ModerationText(f);
    }

    /** Текст для ИИ: «Поле: значение» построчно, с ограничением длины. */
    public String render(int maxChars) {
        StringBuilder sb = new StringBuilder();
        fields.forEach((k, v) -> sb.append(k).append(": ").append(v).append('\n'));
        return sb.length() > maxChars ? sb.substring(0, maxChars) + "…" : sb.toString().trim();
    }

    private static void put(Map<String, String> f, String key, String value) {
        if (value != null && !value.isBlank()) {
            f.merge(key, value.trim(), (a, b) -> a + "; " + b);
        }
    }

    private static String stringify(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Collection<?> c) {
            return c.stream().map(String::valueOf).collect(Collectors.joining(", "));
        }
        if (value instanceof Boolean) {
            return null; // «да/нет» не несёт текста для проверки
        }
        return String.valueOf(value);
    }

    private static String join(List<String> values) {
        return values == null || values.isEmpty() ? null : String.join(", ", values);
    }
}
