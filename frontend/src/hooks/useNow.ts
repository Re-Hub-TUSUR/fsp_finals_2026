import { useState } from 'react';
import { usePolling } from './usePolling';

/** Текущее время, обновляемое раз в `stepMs`: статусы «идёт сейчас» и «сегодня» не застывают на открытой вкладке. */
export function useNow(stepMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  usePolling(() => setNow(Date.now()), stepMs);
  return now;
}
