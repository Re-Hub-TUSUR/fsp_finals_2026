import type { SportEvent } from '../types';
import { isForeignZone, spotsLeft, utcLabel } from './format';

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

/** Русская плюрализация: plural(3, 'место', 'места', 'мест') → «места». */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export interface EventStatusView {
  label: string;
  /** Есть ли «особый» статус (мало мест / идёт / мест нет) — обычное событие без чипа */
  special: boolean;
  /** Классы чипа статуса */
  chip: string;
  /** Класс заливки полосы заполненности */
  bar: string;
  /** Класс цвета текста «Свободно N» */
  freeInk: string;
  /** «Свободно 3» / «Мест нет» */
  freeShort: string;
  /** Заполненность, 0–100 */
  pct: number;
  live: boolean;
}

export function eventStatus(event: SportEvent): EventStatusView {
  const left = spotsLeft(event);
  const pct = event.capacity ? Math.min(100, Math.round((event.confirmedCount / event.capacity) * 100)) : 0;
  const live = isLive(event);
  const freeShort = left === 0 ? 'Мест нет' : `Свободно ${left}`;
  if (left === 0)
    return { label: 'Мест нет', special: true, chip: 'bg-surface-2 text-muted', bar: 'bg-muted', freeInk: 'text-muted', freeShort, pct, live };
  if (left <= 2)
    return { label: `Осталось ${left}`, special: true, chip: 'bg-warn-tint text-warn-ink', bar: 'bg-flame', freeInk: 'text-warn-ink', freeShort, pct, live };
  if (live)
    return { label: 'Идёт сейчас', special: true, chip: 'bg-brand-tint text-brand-ink', bar: 'bg-brand', freeInk: 'text-brand-ink', freeShort, pct, live };
  return {
    label: `${event.confirmedCount} из ${event.capacity}`,
    special: false,
    chip: 'bg-surface text-ink',
    bar: 'bg-brand',
    freeInk: 'text-brand-ink',
    freeShort,
    pct,
    live,
  };
}

/** Статус мест текстом: «Свободно 8 из 20» / «Осталось 1 из 10» / «Мест нет». */
export function seatText(event: Pick<SportEvent, 'capacity' | 'confirmedCount'>): string {
  const left = spotsLeft(event);
  if (left === 0) return 'Мест нет';
  return `${left <= 2 ? 'Осталось' : 'Свободно'} ${left} из ${event.capacity}`;
}

/** Пользователь стоит в очереди на мероприятие. */
export const isWaitlisted = (event: Pick<SportEvent, 'myParticipation'>) => event.myParticipation?.status === 'WAITLISTED';

/** Главное действие по событию: запись, заявка, очередь или уже записан. */
export function eventAction(event: SportEvent): { label: string; cls: string; joinable: boolean } {
  if (isMine(event))
    return {
      label: event.myParticipation?.status === 'PENDING' ? 'Заявка отправлена' : 'Вы записаны ✓',
      cls: 'bg-brand-tint text-brand-ink',
      joinable: false,
    };
  if (isWaitlisted(event))
    // Освободилось место — очередь может его занять, кто первый откликнется
    return isFull(event)
      ? { label: 'Вы в очереди', cls: 'bg-surface-2 text-muted', joinable: false }
      : { label: 'Занять место', cls: 'bg-brand text-on-brand hover:bg-brand-hover', joinable: true };
  if (isFull(event)) return { label: 'Встать в очередь', cls: 'bg-surface-2 text-ink hover:bg-surface', joinable: true };
  return {
    label: event.joinMode === 'APPROVAL' ? 'Подать заявку' : 'Записаться',
    cls: 'bg-brand text-on-brand hover:bg-brand-hover',
    joinable: true,
  };
}

/** Цена коротко: «Бесплатно» / «500 ₽». */
export const priceLabel = (event: Pick<SportEvent, 'price'>) =>
  event.price ? `${event.price.toLocaleString('ru-RU')} ₽` : 'Бесплатно';

/** «Бесплатно» / «Платно · 500 ₽». */
export const accessLabel = (event: Pick<SportEvent, 'price'>) =>
  event.price ? `Платно · ${event.price.toLocaleString('ru-RU')} ₽` : 'Бесплатно';

/** «12 мин пешком» / «28 мин на транспорте». */
export function travelLabel(km: number): string {
  return km < 2 ? `${Math.max(3, Math.round(km * 13))} мин пешком` : `${Math.round(km * 4 + 8)} мин на транспорте`;
}

/**
 * Адрес → основная строка (до первой запятой) и уточнение.
 * Город в начале адреса («Красноярск, Октябрьский мост, …») не повторяем — он и так виден в шапке.
 */
export function splitAddress(address: string, cityName?: string): { main: string; sub: string } {
  let parts = address.split(/,\s*/).filter(Boolean);
  const first = parts[0]?.replace(/^г\.\s*/i, '').toLowerCase();
  const isCity = cityName ? first === cityName.toLowerCase() : /^[a-zа-яё-]+$/i.test(first ?? '');
  if (parts.length > 1 && isCity) parts = parts.slice(1);
  return { main: parts[0] ?? address, sub: parts.slice(1).join(', ') };
}

/** Полосы расстояния для секций списка. */
export const DISTANCE_BANDS: { from: number; to: number; title: string; sub: string }[] = [
  { from: 0, to: 1, title: 'До 1 км', sub: 'До 15 минут пешком' },
  { from: 1, to: 3, title: '1–3 км', sub: '15–40 минут пешком' },
  { from: 3, to: 5, title: '3–5 км', sub: 'Около 20 минут на транспорте' },
  { from: 5, to: 10, title: '5–10 км', sub: 'Около 30 минут на транспорте' },
  { from: 10, to: Infinity, title: 'Дальше 10 км', sub: '' },
];

// Время события показываем в поясе места проведения (event.timeZone) — так же, как страница события;
// без пояса (старые данные, тесты) — в поясе браузера.
const time = (d: Date, timeZone?: string) =>
  d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone });
const dateIn = (d: Date, opts: Intl.DateTimeFormatOptions, timeZone?: string) =>
  d.toLocaleDateString('ru-RU', { ...opts, timeZone });

/** « (UTC+7)» для события в чужом поясе, иначе пусто. */
export const zoneSuffix = (timeZone?: string) => (timeZone && isForeignZone(timeZone) ? ` (${utcLabel(timeZone)})` : '');

/** Ключ дня yyyymmdd в заданном поясе (без пояса — локальный, как dayKey). */
export function dayKeyIn(d: Date, timeZone?: string): number {
  if (!timeZone) return dayKey(d);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return get('year') * 10000 + get('month') * 100 + get('day');
}

const keyToUtcDays = (k: number) => Date.UTC(Math.floor(k / 10000), (Math.floor(k / 100) % 100) - 1, k % 100) / 86400000;

/** Разница в календарных днях между d и «сегодня» (в поясе timeZone). */
export function dayDiff(d: Date, now = new Date(), timeZone?: string): number {
  return Math.round(keyToUtcDays(dayKeyIn(d, timeZone)) - keyToUtcDays(dayKeyIn(now, timeZone)));
}

/** «Сейчас», «19:00», «Завтра, 19:00», «24 окт, 19:00». */
export function startLabel(event: Pick<SportEvent, 'startTime' | 'endTime' | 'timeZone'>): string {
  if (isLive(event)) return 'Сейчас';
  const tz = event.timeZone;
  const d = new Date(event.startTime);
  const diff = dayDiff(d, new Date(), tz);
  if (diff === 0) return time(d, tz);
  if (diff === 1) return `Завтра, ${time(d, tz)}`;
  return `${dateIn(d, { day: 'numeric', month: 'short' }, tz).replace('.', '')}, ${time(d, tz)}`;
}

/** Колонка времени в ряду списка: «Сейчас / до 20:00», «19:30 / сегодня», «11:00 / сб, 24 окт». */
export function rowTime(event: Pick<SportEvent, 'startTime' | 'endTime' | 'timeZone'>): { big: string; small: string } {
  const tz = event.timeZone;
  const zone = zoneSuffix(tz);
  if (isLive(event)) return { big: 'Сейчас', small: `до ${time(new Date(event.endTime), tz)}${zone}` };
  const d = new Date(event.startTime);
  const diff = dayDiff(d, new Date(), tz);
  if (diff === 0) return { big: time(d, tz), small: `сегодня${zone}` };
  if (diff === 1) return { big: time(d, tz), small: `завтра${zone}` };
  const wd = dateIn(d, { weekday: 'short' }, tz).replace('.', '');
  const day = dateIn(d, { day: 'numeric', month: 'short' }, tz).replace('.', '');
  return { big: time(d, tz), small: `${wd}, ${day}${zone}` };
}

/** «Сегодня, 19:00» / «Завтра, 19:00» / «24 октября, 19:00». */
export function startLabelLong(event: Pick<SportEvent, 'startTime' | 'endTime' | 'timeZone'>): string {
  const tz = event.timeZone;
  const d = new Date(event.startTime);
  const diff = dayDiff(d, new Date(), tz);
  const zone = zoneSuffix(tz);
  if (diff === 0) return `Сегодня, ${time(d, tz)}${zone}`;
  if (diff === 1) return `Завтра, ${time(d, tz)}${zone}`;
  return `${dateIn(d, { day: 'numeric', month: 'long' }, tz)}, ${time(d, tz)}${zone}`;
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

/** «20 октября, вт · 07:30» / «Идёт сейчас · до 19:00». */
export function dateFull(event: Pick<SportEvent, 'startTime' | 'endTime' | 'timeZone'>): string {
  const tz = event.timeZone;
  const zone = zoneSuffix(tz);
  if (isLive(event)) return `Идёт сейчас · до ${time(new Date(event.endTime), tz)}${zone}`;
  const d = new Date(event.startTime);
  const day = dateIn(d, { day: 'numeric', month: 'long' }, tz);
  const wd = dateIn(d, { weekday: 'short' }, tz);
  return `${day}, ${wd} · ${time(d, tz)}${zone}`;
}

/** Формат даты для карточек мероприятий из макета: «20 октября, вт 07:30». */
export function formatCardDate(startTime: string | Date, timeZone?: string): string {
  const d = typeof startTime === 'string' ? new Date(startTime) : startTime;
  if (isNaN(d.getTime())) return '';
  const day = dateIn(d, { day: 'numeric', month: 'long' }, timeZone);
  const wd = dateIn(d, { weekday: 'short' }, timeZone).replace('.', '');
  return `${day}, ${wd} ${time(d, timeZone)}${zoneSuffix(timeZone)}`;
}

/** «13 свободных мест» / «2 свободных места» / «1 свободное место» / «Мест нет». */
export function freeSpotsText(count: number): string {
  if (count <= 0) return 'Мест нет';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} свободных мест`;
  if (mod10 === 1) return `${count} свободное место`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} свободных места`;
  return `${count} свободных мест`;
}

/** «17 мест» / «10 мест» / «5 мест» / «1 место». */
export function capacityText(capacity: number): string {
  if (capacity <= 0) return '0 мест';
  const mod10 = capacity % 10;
  const mod100 = capacity % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${capacity} мест`;
  if (mod10 === 1) return `${capacity} место`;
  if (mod10 >= 2 && mod10 <= 4) return `${capacity} места`;
  return `${capacity} мест`;
}

/** «19:00–20:30». */
export const timeRange = (event: Pick<SportEvent, 'startTime' | 'endTime' | 'timeZone'>) =>
  `${time(new Date(event.startTime), event.timeZone)}–${time(new Date(event.endTime), event.timeZone)}${zoneSuffix(event.timeZone)}`;

/** Ключ дня yyyymmdd в локальном времени — для календаря и фильтра «Когда». */
export const dayKey = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
export const keyToDate = (k: number) => new Date(Math.floor(k / 10000), (Math.floor(k / 100) % 100) - 1, k % 100);

/** Фильтр «Когда»: любое время, «сейчас» или интервал дней (from..to включительно). */
export type When = { kind: 'all' } | { kind: 'now' } | { kind: 'range'; from: number; to: number | null };

export function matchesWhen(event: Pick<SportEvent, 'startTime' | 'endTime' | 'timeZone'>, when: When): boolean {
  if (when.kind === 'all') return true;
  if (when.kind === 'now') return isLive(event);
  const from = when.from;
  const to = when.to ?? when.from;
  // Идущее сейчас событие попадает в «сегодня»
  const start = dayKeyIn(new Date(event.startTime), event.timeZone);
  const end = dayKeyIn(new Date(event.endTime), event.timeZone);
  return start <= to && end >= from;
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const fmtKey = (k: number) => `${k % 100} ${MONTHS_SHORT[(Math.floor(k / 100) % 100) - 1]}`;

/** Подпись выбранного «Когда»: «Сейчас», «19 окт», «19–25 окт», «30 окт – 2 ноя». */
export function whenLabel(when: When): string {
  if (when.kind === 'all') return 'Любое время';
  if (when.kind === 'now') return 'Сейчас';
  const a = when.from;
  const b = when.to ?? when.from;
  const today = dayKey(new Date());
  if (a === b && a === today) return 'Сегодня';
  if (a === b && a === dayKey(new Date(Date.now() + 86400000))) return 'Завтра';
  if (a === b) return fmtKey(a);
  return Math.floor(a / 100) === Math.floor(b / 100) ? `${a % 100}–${fmtKey(b)}` : `${fmtKey(a)} – ${fmtKey(b)}`;
}

/** Пресеты «Когда» из макета. */
export function whenPresets(now = new Date()): { label: string; when: When }[] {
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 86400000));
  const wd = now.getDay();
  // Ближайшие выходные; в воскресенье — только сегодня
  const sat = wd === 0 ? null : dayKey(new Date(now.getTime() + ((6 - wd + 7) % 7) * 86400000));
  const sun = dayKey(new Date(now.getTime() + ((7 - wd) % 7) * 86400000));
  return [
    { label: 'Любое время', when: { kind: 'all' } },
    { label: 'Сейчас', when: { kind: 'now' } },
    { label: 'Сегодня', when: { kind: 'range', from: today, to: null } },
    { label: 'Завтра', when: { kind: 'range', from: tomorrow, to: null } },
    { label: 'Выходные', when: { kind: 'range', from: sat ?? sun, to: sat ? sun : null } },
  ];
}

export const sameWhen = (a: When, b: When) =>
  a.kind === b.kind &&
  (a.kind !== 'range' || (b.kind === 'range' && a.from === b.from && (a.to ?? a.from) === (b.to ?? b.from)));

/** Ссылка на построение маршрута в 2GIS. */
// Формат /directions/points/<откуда>|<куда> сохраняет точку; старый /routeSearch/... 2GIS сводил к странице города
export const routeUrl = (lat: number, lng: number) => `https://2gis.ru/directions/points/%7C${lng},${lat}`;

/** Построение маршрута до точки в разных картах (2GIS принимает lng,lat; остальные — lat,lng). */
export const routeLinks = (lat: number, lng: number) => [
  { id: '2gis', name: '2GIS', url: routeUrl(lat, lng) },
  { id: 'yandex', name: 'Яндекс Карты', url: `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto` },
  { id: 'google', name: 'Google Maps', url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` },
];
