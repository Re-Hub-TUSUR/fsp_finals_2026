package ru.sportikus.moderation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.moderation.llm.LlmModerationClient;
import ru.sportikus.moderation.llm.LlmUnavailableException;
import ru.sportikus.moderation.llm.LlmVerdict;
import ru.sportikus.sport.model.Sport;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EventModerationServiceTest {

    @Mock LlmModerationClient llm;
    // default-методы репозитория (require*) работают по-настоящему поверх застабленных find*
    @Mock(answer = Answers.CALLS_REAL_METHODS) EventRepository eventRepository;
    @Mock TransactionTemplate tx;

    ModerationProperties props;
    EventModerationService service;

    private static final Sport RUN = Sport.builder().id(1L).name("Бег").slug("beg").isCustom(false).build();

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        props = new ModerationProperties();
        service = new EventModerationService(new BannedWordFilter(), llm, props, eventRepository, tx);
        // Транзакции в тесте выполняются сразу
        when(tx.execute(any())).thenAnswer(inv -> ((TransactionCallback<Object>) inv.getArgument(0)).doInTransaction(null));
        doAnswer(inv -> {
            ((Consumer<Object>) inv.getArgument(0)).accept(null);
            return null;
        }).when(tx).executeWithoutResult(any());
    }

    private static Event event(String title, Sport sport) {
        return Event.builder().id(10L).title(title).sport(sport).address("Красноярск").build();
    }

    @Test
    void cleanEventIsPublishedWithoutLlm() {
        Event e = event("Утренняя пробежка 5 км", RUN);
        assertThat(service.screen(e)).isFalse();
        assertThat(e.getStatus()).isEqualTo(EventStatus.PUBLISHED);
        assertThat(e.getModerationStatus()).isEqualTo(ModerationStatus.CLEAN);
        verify(llm, never()).review(anyString(), anyList());
    }

    @Test
    void suspiciousEventIsHiddenUntilReview() {
        Event e = event("Пивной забег", RUN);
        assertThat(service.screen(e)).isTrue();
        assertThat(e.getStatus()).isEqualTo(EventStatus.MODERATION);
        assertThat(e.getModerationStatus()).isEqualTo(ModerationStatus.PENDING);
        assertThat(e.getModerationHits()).extracting(ModerationHit::category).contains(ContentCategory.ALCOHOL);
    }

    @Test
    void customSportAndOtherCategoryGoToLlm() {
        Sport custom = Sport.builder().id(2L).name("Петанк").slug("petank").isCustom(true).build();
        assertThat(service.screen(event("Игра в парке", custom))).isTrue();

        Sport other = Sport.builder().id(3L).name("Другое").slug("drugoe").isCustom(false).build();
        assertThat(service.screen(event("Встреча клуба", other))).isTrue();

        props.setReviewCustomSports(false);
        assertThat(service.screen(event("Игра в парке", custom))).isFalse();
    }

    @Test
    void disabledModerationPublishesEverything() {
        props.setEnabled(false);
        Event e = event("Пивной забег", RUN);
        assertThat(service.screen(e)).isFalse();
        assertThat(e.getStatus()).isEqualTo(EventStatus.PUBLISHED);
    }

    private Event pending(String title) {
        Event e = event(title, RUN);
        service.screen(e);
        when(eventRepository.findDetailedById(10L)).thenReturn(Optional.of(e));
        when(eventRepository.findById(10L)).thenReturn(Optional.of(e));
        return e;
    }

    @Test
    void llmRejectionUnpublishesWithReasonForAuthor() {
        Event e = pending("Пивной забег");
        when(llm.review(anyString(), anyList()))
                .thenReturn(new LlmVerdict(LlmVerdict.Decision.REJECT, "Мероприятие продвигает алкоголь", "yandex/aliceai-llm-flash"));

        service.review(10L);

        assertThat(e.getStatus()).isEqualTo(EventStatus.UNPUBLISHED);
        assertThat(e.getModerationStatus()).isEqualTo(ModerationStatus.REJECTED);
        assertThat(e.getUnpublishReason()).isEqualTo("Не прошло автоматическую проверку: Мероприятие продвигает алкоголь");
        assertThat(e.getModerationModel()).isEqualTo("yandex/aliceai-llm-flash");
    }

    @Test
    void llmApprovalPublishesButFlagsForAdmin() {
        Event e = pending("Забег без алкоголя");
        when(llm.review(anyString(), anyList()))
                .thenReturn(new LlmVerdict(LlmVerdict.Decision.APPROVE, "Спортивный забег, алкоголь упомянут в запрете", "m"));

        service.review(10L);

        assertThat(e.getStatus()).isEqualTo(EventStatus.PUBLISHED);
        assertThat(e.getModerationStatus()).isEqualTo(ModerationStatus.FLAGGED);
        assertThat(e.getModerationReason()).contains("Спортивный забег");
    }

    @Test
    void llmFailureDoesNotBlockAuthorButFlagsForManualCheck() {
        Event e = pending("Пивной забег");
        when(llm.review(anyString(), anyList())).thenThrow(new LlmUnavailableException("шлюз не ответил вовремя"));

        service.review(10L);

        assertThat(e.getStatus()).isEqualTo(EventStatus.PUBLISHED);
        assertThat(e.getModerationStatus()).isEqualTo(ModerationStatus.FLAGGED);
        assertThat(e.getModerationReason()).contains("шлюз не ответил вовремя").contains("ручная проверка");
    }

    @Test
    void reviewIsIdempotent() {
        Event e = event("Утренняя пробежка", RUN);
        service.screen(e); // CLEAN
        when(eventRepository.findDetailedById(10L)).thenReturn(Optional.of(e));

        service.review(10L);

        verify(llm, never()).review(anyString(), anyList());
        assertThat(e.getModerationStatus()).isEqualTo(ModerationStatus.CLEAN);
        assertThat(List.of(e.getStatus())).containsExactly(EventStatus.PUBLISHED);
    }
}
