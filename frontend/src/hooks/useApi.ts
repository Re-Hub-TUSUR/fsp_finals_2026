import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client';

interface ApiState<T> {
  /** Ключ запроса (параметры + номер попытки), к которому относится результат. */
  key: string | null;
  /** Ключ одних параметров — чтобы отличать перезагрузку от новых параметров. */
  paramsKey: string | null;
  data: T | undefined;
  error: string | null;
}

export interface UseApiResult<T> {
  /** Последний успешный ответ (сохраняется на время перезагрузки). */
  data: T | undefined;
  /** Первичная загрузка или смена параметров: показывать спиннер вместо данных. */
  loading: boolean;
  /** Фоновое обновление после reload(): данные на экране остаются. */
  refreshing: boolean;
  error: string | null;
  /** Повторить запрос с теми же параметрами (кнопка «Повторить»). */
  reload: () => void;
  /** Локально поправить данные после действия пользователя, не перезапрашивая сервер. */
  mutate: (update: (prev: T | undefined) => T | undefined) => void;
  /** Показать ошибку действия рядом с данными (например, неудачное «прочитать все»). */
  setError: (message: string | null) => void;
}

/**
 * Загрузка данных с сервера для экрана: loading / error / data / «Повторить».
 *
 * `deps` — сериализуемые параметры запроса: при их смене запрос повторяется, а ответы
 * на устаревшие параметры отбрасываются (быстрое переключение вкладок, фильтров, карты).
 * Сигнал отмены передаётся в `fetcher` и срабатывает при смене параметров и размонтировании.
 */
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  { enabled = true, errorFallback }: { enabled?: boolean; errorFallback?: string } = {},
): UseApiResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ApiState<T>>({ key: null, paramsKey: null, data: undefined, error: null });
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const paramsKey = JSON.stringify(deps);
  const key = `${paramsKey}#${attempt}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetcherRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, paramsKey, data, error: null });
      },
      (e: unknown) => {
        if (!controller.signal.aborted)
          setState((prev) => ({ key, paramsKey, data: prev.data, error: errorMessage(e, errorFallback) }));
      },
    );
    return () => controller.abort();
    // paramsKey входит в key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, errorFallback]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const mutate = useCallback((update: (prev: T | undefined) => T | undefined) => {
    setState((prev) => ({ ...prev, data: update(prev.data) }));
  }, []);
  const setError = useCallback((message: string | null) => setState((prev) => ({ ...prev, error: message })), []);

  const current = state.key === key;
  const pending = enabled && !current;
  // Спиннер — только когда показывать нечего: первая загрузка, новые параметры или повтор после ошибки без данных
  const blank = state.paramsKey !== paramsKey || state.data === undefined;
  return {
    data: state.data,
    loading: pending && blank,
    refreshing: pending && !blank,
    error: current || !enabled ? state.error : null,
    reload,
    mutate,
    setError,
  };
}
