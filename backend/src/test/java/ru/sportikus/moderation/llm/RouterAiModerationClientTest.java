package ru.sportikus.moderation.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import ru.sportikus.moderation.ContentCategory;
import ru.sportikus.moderation.ModerationHit;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RouterAiModerationClientTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void parsesPlainAndFencedJson() {
        LlmVerdict plain = RouterAiModerationClient.parse(
                "{\"decision\": \"reject\", \"reason\": \"Дегустация вина не относится к спорту\"}", "m", json);
        assertThat(plain.decision()).isEqualTo(LlmVerdict.Decision.REJECT);
        assertThat(plain.reason()).isEqualTo("Дегустация вина не относится к спорту");
        assertThat(plain.model()).isEqualTo("m");

        LlmVerdict fenced = RouterAiModerationClient.parse(
                "```json\n{\"decision\":\"APPROVE\",\"reason\":\"Забег без алкоголя\"}\n```", "m", json);
        assertThat(fenced.decision()).isEqualTo(LlmVerdict.Decision.APPROVE);
    }

    @Test
    void fillsMissingReason() {
        assertThat(RouterAiModerationClient.parse("{\"decision\":\"reject\"}", "m", json).reason()).isNotBlank();
    }

    @Test
    void rejectsGarbage() {
        assertThatThrownBy(() -> RouterAiModerationClient.parse("Конечно! Это хорошее мероприятие.", "m", json))
                .isInstanceOf(LlmUnavailableException.class);
        assertThatThrownBy(() -> RouterAiModerationClient.parse("{\"decision\":\"maybe\"}", "m", json))
                .isInstanceOf(LlmUnavailableException.class);
        assertThatThrownBy(() -> RouterAiModerationClient.parse("{broken", "m", json))
                .isInstanceOf(LlmUnavailableException.class);
    }

    @Test
    void userMessageWrapsEventAsDataAndListsHits() {
        String message = RouterAiModerationClient.userMessage("Название: Пивной забег",
                List.of(new ModerationHit(ContentCategory.ALCOHOL, "пивной", "Название")));
        assertThat(message).contains("алкоголь: «пивной» (Название)")
                .contains("<event>\nНазвание: Пивной забег\n</event>");
    }
}
