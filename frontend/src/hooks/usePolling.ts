import { useEffect, useRef } from 'react';

/**
 * Периодически вызывает `tick`, пока вкладка видна. В фоне опрос останавливается,
 * а при возвращении на вкладку данные обновляются сразу. Первый вызов делает сам компонент.
 */
export function usePolling(tick: () => void, intervalMs: number, enabled = true) {
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const start = () => {
      timer ??= window.setInterval(() => tickRef.current(), intervalMs);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        tickRef.current();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
