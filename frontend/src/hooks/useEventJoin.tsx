import React, { useState } from 'react';
import type { SportEvent } from '../types';
import { eventsApi, participationApi } from '../api';
import { errorMessage } from '../api/client';
import { isFull, isWaitlisted } from '../utils/eventView';
import { JoinDialog } from '../components/JoinDialog';

/**
 * Запись на событие из карточек и панели: анкета организатора (JoinDialog) или, если человек стоит
 * в очереди и место освободилось, — сразу «Занять место» без анкеты (она сохранена при постановке в очередь).
 */
export function useEventJoin(event: SportEvent, onChanged: () => void) {
  const [joinEvent, setJoinEvent] = useState<SportEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isWaitlisted(event)) {
        try {
          await participationApi.join(event.id, {});
        } finally {
          onChanged();
        }
      } else {
        // В списке нет анкеты и требований организатора — берём полную карточку
        setJoinEvent(await eventsApi.get(event.id));
      }
    } catch (e) {
      setError(errorMessage(e, 'Не удалось записаться'));
    } finally {
      setBusy(false);
    }
  };

  const dialog: React.ReactNode = joinEvent && (
    <JoinDialog
      event={joinEvent}
      waitlist={isFull(event)}
      onClose={() => setJoinEvent(null)}
      onDone={() => {
        setJoinEvent(null);
        onChanged();
      }}
    />
  );

  return { start, busy, error, dialog };
}
