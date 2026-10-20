import React, { useEffect, useState } from 'react';
import { SportIcon } from '../EventBits';

/*
 * «Стеклянная» карточка встречи поверх фото героя: счётчик записавшихся один раз дорастает
 * до полного состава и останавливается (без бесконечного движения — паузу делать не нужно).
 * При prefers-reduced-motion сразу показываем собранный состав.
 */

const CAPACITY = 10;
const START = 6;
const TICK_MS = 1300;
const PEOPLE = ['АК', 'МС', 'ИП', 'ОЛ', 'ДВ'];

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const HeroEventCard: React.FC = () => {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? CAPACITY : START));

  useEffect(() => {
    if (count >= CAPACITY) return;
    const id = window.setTimeout(() => setCount((c) => c + 1), TICK_MS);
    return () => window.clearTimeout(id);
  }, [count]);

  const full = count >= CAPACITY;

  return (
    <div aria-hidden="true" className="w-[300px] rounded-card border border-snow/20 bg-night/45 p-4 text-snow shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-night">
          <SportIcon name="Футбол" size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">Футбол во дворе</p>
          <p className="mt-0.5 truncate text-sm text-snow/70">Сегодня, 19:00 · 800 м от вас</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {PEOPLE.slice(0, Math.min(PEOPLE.length, count - 3)).map((p) => (
            <span
              key={p}
              className="anim-rise flex h-9 w-9 items-center justify-center rounded-full border-2 border-night/60 bg-snow text-caption font-bold text-night"
            >
              {p}
            </span>
          ))}
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {count}/{CAPACITY}
        </span>
      </div>

      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-snow/15">
        <div
          className="h-full w-full origin-left rounded-full bg-brand transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${count / CAPACITY})` }}
        />
      </div>
      <p className="mt-2.5 text-sm font-medium text-snow/85">{full ? 'Состав собран, игра состоится' : 'Ищем ещё игроков'}</p>
    </div>
  );
};
