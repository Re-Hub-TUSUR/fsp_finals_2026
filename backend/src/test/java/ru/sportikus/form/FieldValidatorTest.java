package ru.sportikus.form;

import org.junit.jupiter.api.Test;
import ru.sportikus.common.ApiException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FieldValidatorTest {

    private final FieldValidator validator = new FieldValidator();

    private static FieldDef field(String key, FieldType type, boolean required, String... options) {
        return new FieldDef(key, "Поле " + key, type, required,
                options.length == 0 ? null : List.of(options), null, null, null);
    }

    @Test
    void acceptsValidValuesAndDropsEmptyOnes() {
        List<FieldDef> defs = List.of(
                field("title", FieldType.TEXT, true),
                field("distance", FieldType.NUMBER, false),
                field("level", FieldType.SELECT, false, "A", "B"),
                field("tags", FieldType.MULTISELECT, false, "x", "y"),
                field("flag", FieldType.BOOLEAN, false),
                field("note", FieldType.TEXT, false));

        Map<String, Object> result = validator.validateValues(defs, Map.of(
                "title", "  Забег ", "distance", "5,5", "level", "A", "tags", List.of("x", "x"), "flag", false, "note", " "),
                "ctx");

        assertThat(result).containsEntry("title", "Забег")
                .containsEntry("distance", 5.5)
                .containsEntry("level", "A")
                .containsEntry("tags", List.of("x"))
                .containsEntry("flag", false)
                .doesNotContainKey("note");
    }

    @Test
    void wholeNumbersStayIntegers() {
        Map<String, Object> result = validator.validateValues(
                List.of(field("n", FieldType.NUMBER, false)), Map.of("n", 10.0), "ctx");
        assertThat(result.get("n")).isEqualTo(10L);
    }

    private static FieldDef number(String key, Double min, Double max, Boolean integer) {
        return new FieldDef(key, "Поле " + key, FieldType.NUMBER, false, null, null, null, null, min, max, integer);
    }

    @Test
    void numbersAreNotNegativeByDefault() {
        List<FieldDef> defs = List.of(field("n", FieldType.NUMBER, false));
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("n", -3), "ctx"))
                .isInstanceOf(ApiException.class).hasMessageContaining("не меньше 0");
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("n", "-0,5"), "ctx"))
                .isInstanceOf(ApiException.class);
        assertThat(validator.validateValues(defs, Map.of("n", 0), "ctx")).containsEntry("n", 0L);
    }

    @Test
    void enforcesMinMaxAndIntegerBounds() {
        List<FieldDef> defs = List.of(number("teams", 1d, 100d, true), number("km", 0.1, null, null));
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("teams", 0), "ctx"))
                .isInstanceOf(ApiException.class).hasMessageContaining("не меньше 1");
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("teams", 101), "ctx"))
                .isInstanceOf(ApiException.class).hasMessageContaining("не больше 100");
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("teams", 2.5), "ctx"))
                .isInstanceOf(ApiException.class).hasMessageContaining("целым");
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("km", -3), "ctx"))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("km", 0), "ctx"))
                .isInstanceOf(ApiException.class);
        assertThat(validator.validateValues(defs, Map.of("teams", 4, "km", 5.5), "ctx"))
                .containsEntry("teams", 4L).containsEntry("km", 5.5);
    }

    @Test
    void rejectsInvalidBoundsInClientDefinitions() {
        assertThatThrownBy(() -> validator.validateDefinitions(List.of(number("q", -5d, null, null)), "Вопросы"))
                .isInstanceOf(ApiException.class).hasMessageContaining("отрицательным");
        assertThatThrownBy(() -> validator.validateDefinitions(List.of(number("q", 10d, 5d, null)), "Вопросы"))
                .isInstanceOf(ApiException.class).hasMessageContaining("меньше минимума");
        assertThat(validator.validateDefinitions(List.of(number("q", 1d, 9d, true)), "Вопросы").get(0).max()).isEqualTo(9d);
    }

    @Test
    void rejectsMissingRequiredField() {
        List<FieldDef> defs = List.of(field("title", FieldType.TEXT, true));
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of(), "ctx"))
                .isInstanceOf(ApiException.class).hasMessageContaining("Поле title");
    }

    @Test
    void requiredBooleanMustBeTrue() {
        List<FieldDef> defs = List.of(field("agree", FieldType.BOOLEAN, true));
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("agree", false), "ctx"))
                .isInstanceOf(ApiException.class);
        assertThat(validator.validateValues(defs, Map.of("agree", true), "ctx")).containsEntry("agree", true);
    }

    @Test
    void rejectsUnknownKeysWrongTypesAndForeignOptions() {
        List<FieldDef> defs = List.of(
                field("n", FieldType.NUMBER, false), field("s", FieldType.SELECT, false, "A"));
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("zzz", 1), "ctx"))
                .isInstanceOf(ApiException.class).hasMessageContaining("неизвестное");
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("n", "abc"), "ctx"))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> validator.validateValues(defs, Map.of("s", "C"), "ctx"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void validatesDefinitionsFromClient() {
        assertThat(validator.validateDefinitions(
                List.of(field("q1", FieldType.SELECT, true, " да ", "нет", "")), "Вопросы"))
                .singleElement().satisfies(def -> assertThat(def.options()).containsExactly("да", "нет"));

        assertThatThrownBy(() -> validator.validateDefinitions(
                List.of(field("q1", FieldType.TEXT, false), field("q1", FieldType.TEXT, false)), "Вопросы"))
                .isInstanceOf(ApiException.class).hasMessageContaining("повторяется");
        assertThatThrownBy(() -> validator.validateDefinitions(
                List.of(field("1bad key", FieldType.TEXT, false)), "Вопросы")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> validator.validateDefinitions(
                List.of(field("q", FieldType.SELECT, false)), "Вопросы")).isInstanceOf(ApiException.class);
    }
}
