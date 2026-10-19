package ru.sportikus.event.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ru.sportikus.participation.ParticipationChangedEvent;

/**
 * Сбрасывает кэш карты, когда меняется то, что на ней видно: публикация, статус, число участников.
 * Сброс — строго после коммита: иначе параллельный запрос успел бы закэшировать ещё старые данные.
 */
@Component
@RequiredArgsConstructor
public class MapCacheInvalidator {

    private final MapCache cache;

    /** Вызывать из любого места, меняющего данные карты; внутри транзакции сброс откладывается до коммита. */
    public void mapDataChanged() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    cache.invalidate();
                }
            });
        } else {
            cache.invalidate();
        }
    }

    /** Запись, отмена, решение организатора меняют число занятых мест. */
    @TransactionalEventListener(fallbackExecution = true)
    public void onParticipationChanged(ParticipationChangedEvent e) {
        cache.invalidate();
    }
}
