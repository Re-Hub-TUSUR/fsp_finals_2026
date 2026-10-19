package ru.sportikus.form;

import org.springframework.stereotype.Component;
import ru.sportikus.common.ApiException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Проверяет описания полей (определённые автором) и значения, введённые по этим описаниям.
 * Благодаря этому форма мероприятия и форма заявки полностью управляются данными, а не кодом.
 */
@Component
public class FieldValidator {

    public static final int MAX_FIELDS = 12;
    private static final int MAX_OPTIONS = 20;
    private static final int MAX_TEXT = 500;
    private static final int MAX_TEXTAREA = 3000;
    private static final Pattern KEY = Pattern.compile("[A-Za-z][A-Za-z0-9_]{0,39}");

    /** Проверяет и нормализует список описаний полей, пришедший от клиента. */
    public List<FieldDef> validateDefinitions(List<FieldDef> defs, String context) {
        if (defs == null) {
            return List.of();
        }
        if (defs.size() > MAX_FIELDS) {
            throw ApiException.badRequest(context + ": не более " + MAX_FIELDS + " полей");
        }
        Set<String> keys = new HashSet<>();
        List<FieldDef> result = new ArrayList<>();
        for (FieldDef def : defs) {
            if (def == null || def.key() == null || !KEY.matcher(def.key()).matches()) {
                throw ApiException.badRequest(context + ": некорректный ключ поля");
            }
            if (!keys.add(def.key())) {
                throw ApiException.badRequest(context + ": ключ «" + def.key() + "» повторяется");
            }
            if (def.label() == null || def.label().isBlank() || def.label().length() > 100) {
                throw ApiException.badRequest(context + ": у поля «" + def.key() + "» нужно название до 100 символов");
            }
            if (def.type() == null) {
                throw ApiException.badRequest(context + ": у поля «" + def.label() + "» не указан тип");
            }
            List<String> options = def.options() == null ? List.of() : def.options().stream()
                    .map(o -> o == null ? "" : o.trim())
                    .filter(o -> !o.isEmpty())
                    .distinct()
                    .toList();
            boolean choice = def.type() == FieldType.SELECT || def.type() == FieldType.MULTISELECT;
            if (choice && (options.isEmpty() || options.size() > MAX_OPTIONS)) {
                throw ApiException.badRequest(context + ": у поля «" + def.label() + "» нужно от 1 до "
                        + MAX_OPTIONS + " вариантов");
            }
            if (options.stream().anyMatch(o -> o.length() > 100)) {
                throw ApiException.badRequest(context + ": вариант ответа длиннее 100 символов");
            }
            boolean number = def.type() == FieldType.NUMBER;
            if (number) {
                checkBounds(context, def);
            }
            result.add(new FieldDef(def.key(), def.label().trim(), def.type(), def.required(),
                    choice ? options : null, trimToNull(def.unit()), trimToNull(def.placeholder()),
                    trimToNull(def.help()),
                    number ? def.min() : null, number ? def.max() : null,
                    number && Boolean.TRUE.equals(def.integer()) ? Boolean.TRUE : null));
        }
        return result;
    }

    /**
     * Проверяет значения по описаниям. Возвращает очищенную карту: пустые значения отброшены,
     * числа приведены к Number. Неизвестные ключи считаются ошибкой.
     */
    public Map<String, Object> validateValues(List<FieldDef> defs, Map<String, Object> values, String context) {
        Map<String, Object> input = values == null ? Map.of() : values;
        Map<String, FieldDef> byKey = new LinkedHashMap<>();
        for (FieldDef def : defs) {
            byKey.put(def.key(), def);
        }
        for (String key : input.keySet()) {
            if (!byKey.containsKey(key)) {
                throw ApiException.badRequest(context + ": неизвестное поле «" + key + "»");
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (FieldDef def : defs) {
            Object cleaned = clean(def, input.get(def.key()));
            if (cleaned == null) {
                if (def.required()) {
                    throw ApiException.badRequest(context + ": заполните поле «" + def.label() + "»");
                }
                continue;
            }
            if (def.required() && def.type() == FieldType.BOOLEAN && Boolean.FALSE.equals(cleaned)) {
                throw ApiException.badRequest(context + ": подтвердите «" + def.label() + "»");
            }
            result.put(def.key(), cleaned);
        }
        return result;
    }

    private Object clean(FieldDef def, Object raw) {
        if (raw == null) {
            return null;
        }
        String label = def.label();
        switch (def.type()) {
            case TEXT, TEXTAREA -> {
                if (!(raw instanceof String s)) {
                    throw ApiException.badRequest("Поле «" + label + "» должно быть текстом");
                }
                String text = s.trim();
                int max = def.type() == FieldType.TEXT ? MAX_TEXT : MAX_TEXTAREA;
                if (text.length() > max) {
                    throw ApiException.badRequest("Поле «" + label + "» длиннее " + max + " символов");
                }
                return text.isEmpty() ? null : text;
            }
            case NUMBER -> {
                BigDecimal number;
                try {
                    if (raw instanceof Number n) {
                        number = new BigDecimal(n.toString());
                    } else if (raw instanceof String s) {
                        if (s.isBlank()) {
                            return null;
                        }
                        number = new BigDecimal(s.trim().replace(',', '.'));
                    } else {
                        throw new NumberFormatException();
                    }
                } catch (NumberFormatException e) {
                    throw ApiException.badRequest("Поле «" + label + "» должно быть числом");
                }
                if (number.abs().compareTo(new BigDecimal("1000000000")) > 0) {
                    throw ApiException.badRequest("Поле «" + label + "»: слишком большое число");
                }
                // Без явного min числа не бывают отрицательными (расстояние, команды, длительность, возраст ответа)
                BigDecimal min = BigDecimal.valueOf(def.min() != null ? def.min() : 0d);
                if (number.compareTo(min) < 0) {
                    throw ApiException.badRequest("Поле «" + label + "»: значение не меньше " + plain(min));
                }
                if (def.max() != null && number.compareTo(BigDecimal.valueOf(def.max())) > 0) {
                    throw ApiException.badRequest("Поле «" + label + "»: значение не больше " + plain(BigDecimal.valueOf(def.max())));
                }
                if (Boolean.TRUE.equals(def.integer()) && number.stripTrailingZeros().scale() > 0) {
                    throw ApiException.badRequest("Поле «" + label + "» должно быть целым числом");
                }
                return number.stripTrailingZeros().scale() <= 0 ? (Object) number.longValue() : (Object) number.doubleValue();
            }
            case SELECT -> {
                if (!(raw instanceof String s)) {
                    throw ApiException.badRequest("Поле «" + label + "»: выберите вариант");
                }
                if (s.isBlank()) {
                    return null;
                }
                if (def.options() == null || !def.options().contains(s)) {
                    throw ApiException.badRequest("Поле «" + label + "»: недопустимый вариант");
                }
                return s;
            }
            case MULTISELECT -> {
                if (!(raw instanceof List<?> list)) {
                    throw ApiException.badRequest("Поле «" + label + "»: ожидается список вариантов");
                }
                List<String> chosen = new ArrayList<>();
                for (Object item : list) {
                    if (!(item instanceof String s) || def.options() == null || !def.options().contains(s)) {
                        throw ApiException.badRequest("Поле «" + label + "»: недопустимый вариант");
                    }
                    if (!chosen.contains(s)) {
                        chosen.add(s);
                    }
                }
                return chosen.isEmpty() ? null : chosen;
            }
            case BOOLEAN -> {
                if (!(raw instanceof Boolean b)) {
                    throw ApiException.badRequest("Поле «" + label + "» должно быть да/нет");
                }
                return b;
            }
            default -> throw ApiException.badRequest("Неподдерживаемый тип поля «" + label + "»");
        }
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static void checkBounds(String context, FieldDef def) {
        if ((def.min() != null && (def.min().isNaN() || def.min().isInfinite()))
                || (def.max() != null && (def.max().isNaN() || def.max().isInfinite()))) {
            throw ApiException.badRequest(context + ": некорректные границы у поля «" + def.label() + "»");
        }
        double min = def.min() != null ? def.min() : 0d;
        if (min < 0) {
            throw ApiException.badRequest(context + ": у поля «" + def.label() + "» минимум не может быть отрицательным");
        }
        if (def.max() != null && def.max() < min) {
            throw ApiException.badRequest(context + ": у поля «" + def.label() + "» максимум меньше минимума");
        }
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
