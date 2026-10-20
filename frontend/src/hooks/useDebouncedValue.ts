import { useEffect, useState } from 'react';

/** Значение, которое обновляется только после паузы в изменениях (ввод в поиск, движение карты). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
