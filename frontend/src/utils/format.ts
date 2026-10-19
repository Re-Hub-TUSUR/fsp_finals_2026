import type { JoinMode, ParticipationStatus, PreferredTime, SkillLevel, SportEvent } from '../types';

export const SKILL_LABELS: Record<SkillLevel, string> = {
  NOVICE: 'Новичок',
  AMATEUR: 'Любитель',
  PRO: 'Профи',
  ANY: 'Любой уровень',
};

export const JOIN_MODE_LABELS: Record<JoinMode, string> = {
  OPEN: 'Свободный вход',
  APPROVAL: 'По заявке',
};

export const PARTICIPATION_LABELS: Record<ParticipationStatus, string> = {
  PENDING: 'Ждёт подтверждения',
  CONFIRMED: 'Участие подтверждено',
  REJECTED: 'Заявка отклонена',
  CANCELLED: 'Запись отменена',
  WAITLISTED: 'В очереди',
};

export const PARTICIPATION_STYLES: Record<ParticipationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-brand-tint-2 text-brand-ink border-brand-line',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  WAITLISTED: 'bg-sky-100 text-sky-800 border-sky-200',
};

/** Время показываем в часовом поясе места проведения: страна большая, у участника и события он может отличаться. */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

export function formatShortDateTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone });
}

export function formatTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone });
}

export const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Смещение пояса относительно UTC в миллисекундах в заданный момент. */
function zoneOffsetMs(ts: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** «UTC+7» для подписи часового пояса. */
export function utcLabel(timeZone: string, at: Date = new Date()): string {
  const minutes = Math.round(zoneOffsetMs(at.getTime(), timeZone) / 60000);
  const sign = minutes >= 0 ? '+' : '−';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** Отличается ли пояс события от пояса устройства (тогда подписываем время как местное). */
export function isForeignZone(timeZone?: string): boolean {
  return !!timeZone && utcLabel(timeZone) !== utcLabel(BROWSER_TIME_ZONE);
}

/**
 * Значение datetime-local («2026-10-20T19:00»), введённое как местное время пояса timeZone, → ISO в UTC.
 * Без пояса — время устройства.
 */
export function zonedLocalToIso(value: string, timeZone?: string): string | undefined {
  if (!value) return undefined;
  if (!timeZone) return new Date(value).toISOString();
  const [date, time] = value.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, hh, mm);
  let ts = wall - zoneOffsetMs(wall, timeZone);
  const corrected = wall - zoneOffsetMs(ts, timeZone);
  if (corrected !== ts) ts = corrected; // переход через смену смещения
  return new Date(ts).toISOString();
}

/** «через 40 мин», «через 3 ч», «завтра», «12 окт» — главный якорь метки на карте. */
export function formatTimeBadge(startIso: string, endIso?: string, timeZone?: string): string {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  if (start <= now) {
    return endIso && new Date(endIso).getTime() <= now ? 'Завершено' : 'Идёт сейчас';
  }
  const diffHours = (start - now) / 3600000;
  if (diffHours < 1) return `через ${Math.max(1, Math.round(diffHours * 60))} мин`;
  if (diffHours < 24) return `через ${Math.round(diffHours)} ч`;
  if (diffHours < 48) return 'завтра';
  return new Date(startIso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone });
}

export function formatPrice(price?: number): string {
  return price ? `${price.toLocaleString('ru-RU')} ₽` : 'Бесплатно';
}

export function formatAges(min?: number, max?: number): string | null {
  if (min != null && max != null) return `${min}–${max} лет`;
  if (min != null) return `от ${min} лет`;
  if (max != null) return `до ${max} лет`;
  return null;
}

export function spotsLeft(event: Pick<SportEvent, 'capacity' | 'confirmedCount'>): number {
  return Math.max(0, event.capacity - event.confirmedCount);
}

/** Значение для <input type="datetime-local"> в локальном времени. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Последний момент, когда можно подать заявку. */
export function registrationClosesAt(event: Pick<SportEvent, 'registrationDeadline' | 'startTime'>): Date {
  return new Date(event.registrationDeadline ?? event.startTime);
}

export const PREFERRED_TIME_LABELS: Record<PreferredTime, string> = {
  MORNING: 'Утро',
  DAY: 'День',
  EVENING: 'Вечер',
  WEEKEND: 'Выходные',
};
