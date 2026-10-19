import type { SportEvent } from '../types';
import { spotsLeft } from './format';

/** Общая «витрина» мероприятия для списка, карточки на карте и меток (по референсу редизайна). */

export type LatLng = { lat: number; lng: number };

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '•';
}

export function isLive(event: Pick<SportEvent, 'startTime' | 'endTime'>, now = Date.now()): boolean {
  return new Date(event.startTime).getTime() <= now && now < new Date(event.endTime).getTime();
}

export function isHot(event: Pick<SportEvent, 'capacity' | 'confirmedCount'>): boolean {
  const left = spotsLeft(event);
  return left > 0 && left <= 2;
}

export const isFull = (event: Pick<SportEvent, 'capacity' | 'confirmedCount'>) => spotsLeft(event) === 0;

export const isMine = (event: SportEvent) =>
  event.myParticipation?.status === 'CONFIRMED' || event.myParticipation?.status === 'PENDING';

export interface EventStatusView {
  label: string;
  /** Классы чипа статуса */
  chip: string;
  /** Класс заливки полосы заполненности */
  bar: string;
  /** Заполненность, 0–100 */
  pct: number;
  live: boolean;
}

export function eventStatus(event: SportEvent): EventStatusView {
  const left = spotsLeft(event);
  const pct = event.capacity ? Math.min(100, Math.round((event.confirmedCount / event.capacity) * 100)) : 0;
  const live = isLive(event);
  if (left === 0) return { label: 'Мест нет', chip: 'bg-surface-2 text-muted', bar: 'bg-muted', pct, live };
  if (left <= 2) return { label: `Осталось ${left}`, chip: 'bg-hot-tint text-hot-ink', bar: 'bg-hot', pct, live };
  if (live) return { label: 'Идёт сейчас', chip: 'bg-brand-tint text-brand-ink', bar: 'bg-brand', pct, live };
  return {
    label: `${event.confirmedCount} из ${event.capacity}`,
    chip: 'bg-surface text-ink',
    bar: 'bg-brand',
    pct,
    live,
  };
}

const time = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function dayDiff(d: Date, now = new Date()): number {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / 86400000);
}

/** «Сейчас», «19:00», «Завтра, 19:00», «24 окт, 19:00». */
export function startLabel(event: Pick<SportEvent, 'startTime' | 'endTime'>): string {
  if (isLive(event)) return 'Сейчас';
  const d = new Date(event.startTime);
  const diff = dayDiff(d);
  if (diff === 0) return time(d);
  if (diff === 1) return `Завтра, ${time(d)}`;
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')}, ${time(d)}`;
}

/** «Сегодня, 19:00» / «Завтра, 19:00» / «24 октября, 19:00». */
export function startLabelLong(event: Pick<SportEvent, 'startTime' | 'endTime'>): string {
  const d = new Date(event.startTime);
  const diff = dayDiff(d);
  if (diff === 0) return `Сегодня, ${time(d)}`;
  if (diff === 1) return `Завтра, ${time(d)}`;
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${time(d)}`;
}

/** Расстояние по прямой, км (гаверсинус). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} м`;
  return `${km.toFixed(1).replace('.', ',')} км`;
}

export type WhenFilter = 'all' | 'now' | 'today' | 'tomorrow' | 'weekend';

export const WHEN_LABELS: Record<WhenFilter, string> = {
  all: 'Любое',
  now: 'Сейчас',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  weekend: 'Выходные',
};

export function matchesWhen(event: SportEvent, when: WhenFilter): boolean {
  if (when === 'all') return true;
  if (when === 'now') return isLive(event);
  const d = new Date(event.startTime);
  const diff = dayDiff(d);
  if (when === 'today') return diff === 0 || isLive(event);
  if (when === 'tomorrow') return diff === 1;
  // ближайшие суббота и воскресенье
  const today = new Date().getDay();
  const toSat = (6 - today + 7) % 7;
  const satDiff = today === 0 ? -1 : toSat;
  return diff === satDiff || diff === satDiff + 1;
}

/** Ссылка на построение маршрута в 2GIS. */
export const routeUrl = (lat: number, lng: number) => `https://2gis.ru/routeSearch/rsType/car/to/${lng},${lat}`;
