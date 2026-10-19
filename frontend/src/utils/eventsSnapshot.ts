import type { SportEvent } from '../types';

/**
 * Снимок последней загрузки карты: при следующем заходе пины показываются сразу, пока идёт запрос.
 * Лежит в localStorage, привязан к пользователю и области/фильтрам (в событиях есть «мои» данные),
 * живёт недолго. Любая ошибка хранилища — просто отсутствие снимка.
 */
const STORAGE_KEY = 'sp:events-snapshot:v1';
export const SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000;
export const SNAPSHOT_MAX_EVENTS = 200;

interface Stored {
  key: string;
  savedAt: number;
  events: SportEvent[];
}

export interface SnapshotQuery {
  userId: number | null | undefined;
  lat: number;
  lng: number;
  radiusKm: number;
  sports: string[];
  skill?: string;
  joinMode?: string;
}

/** Центр округляется до ~1 км, радиус вверх — как на сервере, чтобы соседние положения карты совпадали. */
export function snapshotKey(q: SnapshotQuery): string {
  return [
    q.userId ?? 'anon',
    q.lat.toFixed(2),
    q.lng.toFixed(2),
    Math.ceil(q.radiusKm),
    [...q.sports].sort().join(','),
    q.skill ?? '',
    q.joinMode ?? '',
  ].join('|');
}

export function readEventsSnapshot(key: string, now = Date.now()): SportEvent[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    if (stored.key !== key || now - stored.savedAt > SNAPSHOT_MAX_AGE_MS || !Array.isArray(stored.events)) return null;
    return stored.events;
  } catch {
    return null;
  }
}

export function writeEventsSnapshot(key: string, events: SportEvent[], now = Date.now()): void {
  try {
    const stored: Stored = { key, savedAt: now, events: events.slice(0, SNAPSHOT_MAX_EVENTS) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // переполнено или недоступно — снимок необязателен
  }
}
