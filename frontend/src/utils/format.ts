import type { JoinMode, ParticipationStatus, SkillLevel, SportEvent } from '../types';

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
};

export const PARTICIPATION_STYLES: Record<ParticipationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-brand-tint-2 text-brand-ink border-brand-line',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

/** «через 40 мин», «через 3 ч», «завтра», «12 окт» — главный якорь метки на карте. */
export function formatTimeBadge(startIso: string, endIso?: string): string {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  if (start <= now) {
    return endIso && new Date(endIso).getTime() <= now ? 'Завершено' : 'Идёт сейчас';
  }
  const diffHours = (start - now) / 3600000;
  if (diffHours < 1) return `через ${Math.max(1, Math.round(diffHours * 60))} мин`;
  if (diffHours < 24) return `через ${Math.round(diffHours)} ч`;
  if (diffHours < 48) return 'завтра';
  return new Date(startIso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
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

export function localInputToIso(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

/** Последний момент, когда можно подать заявку. */
export function registrationClosesAt(event: Pick<SportEvent, 'registrationDeadline' | 'startTime'>): Date {
  return new Date(event.registrationDeadline ?? event.startTime);
}
