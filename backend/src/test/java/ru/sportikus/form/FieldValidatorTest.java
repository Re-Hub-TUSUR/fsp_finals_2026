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
