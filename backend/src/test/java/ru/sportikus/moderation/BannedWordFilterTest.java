package ru.sportikus.moderation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BannedWordFilterTest {

    private final BannedWordFilter filter = new BannedWordFilter();

    private List<ModerationHit> scan(String text) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("Описание", text);
        return filter.scan(new ModerationText(fields));
    }

    private ContentCategory first(String text) {
        List<ModerationHit> hits = scan(text);
        assertThat(hits).as("ожидалось срабатывание для: " + text).isNotEmpty();
        return hits.get(0).category();
    }

    @Test
    void detectsEachCategory() {
        assertThat(first("Пивной забег по набережной")).isEqualTo(ContentCategory.ALCOHOL);
        assertThat(first("После игры идём в паб")).isEqualTo(ContentCategory.ALCOHOL);
        assertThat(first("Пробежка в поддержку митинга")).isEqualTo(ContentCategory.POLITICS);
        assertThat(first("Футбол, только для славян")).isEqualTo(ContentCategory.DISCRIMINATION);
        assertThat(first("Покурим кальян после тренировки")).isEqualTo(ContentCategory.TOBACCO);
        assertThat(first("Турнир с букмекером")).isEqualTo(ContentCategory.GAMBLING);
        assertThat(first("Расскажем про криптовалюту и пассивный доход")).isEqualTo(ContentCategory.FRAUD);
        assertThat(first("Стероиды для массы")).isEqualTo(ContentCategory.DRUGS);
        assertThat(first("Бои без правил во дворе")).isEqualTo(ContentCategory.VIOLENCE);
        assertThat(first("Вечеринка 18+")).isEqualTo(ContentCategory.ADULT);
    }

    @Test
    void seesThroughObfuscation() {
        assertThat(first("Берём вoдку с собой")).isEqualTo(ContentCategory.ALCOHOL); // латинская «o»
        assertThat(first("Берём в0дку с собой")).isEqualTo(ContentCategory.ALCOHOL); // цифра «0»
        assertThat(first("Будет в.о.д.к.а")).isEqualTo(ContentCategory.ALCOHOL);
        assertThat(first("Будет в о д к а")).isEqualTo(ContentCategory.ALCOHOL);
        assertThat(first("АЛКОГОЛЬ")).isEqualTo(ContentCategory.ALCOHOL);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Утренняя пробежка 5 км по острову Татышев, после — чай",
            "Безалкогольный фитнес-марафон",
            "Займёмся растяжкой и дыхательной гимнастикой",
            "Протестируем новые кроссовки на интервалах",
            "Разберём пивот и подбор в баскетболе",
            "Шахматная партия в парке, контроль 10+5",
            "Бухгалтерия клуба: взнос 300 рублей на аренду",
            "Роспись под хохлому после мастер-класса по йоге",
            "Возьмите жидкость для линз и воду",
            "Страхуемся друг друга на скалодроме",
            "Турнир по игре «Драконы и подземелья» на свежем воздухе",
            "Кредо клуба — регулярность",
    })
    void doesNotFlagOrdinarySportsText(String text) {
        assertThat(scan(text)).as(text).isEmpty();
    }

    @Test
    void recordsFieldAndDeduplicates() {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("Название", "Пиво и футбол");
        fields.put("Описание", "Пиво, пиво и ещё раз пиво");
        List<ModerationHit> hits = filter.scan(new ModerationText(fields));
        assertThat(hits).hasSize(1);
        assertThat(hits.get(0).field()).isEqualTo("Название");
        assertThat(hits.get(0).term()).isEqualTo("пиво");
    }
}
