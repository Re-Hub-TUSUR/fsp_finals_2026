import React from 'react';
import { AlarmClock, Bell, CalendarPlus, CheckCircle2, Hourglass, UserCheck, UserPlus, XCircle } from 'lucide-react';
import type { AppNotification } from '../types';

export function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    if (diff < 172800) return 'вчера';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function notificationIcon(n: AppNotification): React.ReactNode {
  const cls = 'w-5 h-5 shrink-0 mt-0.5';
  switch (n.type) {
    case 'PARTICIPATION_CONFIRMED':
      return <CheckCircle2 className={`${cls} text-brand-ink`} />;
    case 'PARTICIPATION_REJECTED':
      return <XCircle className={`${cls} text-red-700`} />;
    case 'EVENT_INVITE':
      return <CalendarPlus className={`${cls} text-brand-ink`} />;
    case 'EVENT_REMINDER':
      return <AlarmClock className={`${cls} text-brand-ink`} />;
    case 'WAITLIST_SPOT_AVAILABLE':
      return <Hourglass className={`${cls} text-brand-ink`} />;
    case 'WAITLIST_SPOT_TAKEN':
      return <Hourglass className={`${cls} text-muted`} />;
    case 'FRIEND_REQUEST':
      return <UserPlus className={`${cls} text-ink`} />;
    case 'FRIEND_ACCEPTED':
      return <UserCheck className={`${cls} text-ink`} />;
    default:
      return <Bell className={`${cls} text-muted`} />;
  }
}

/** Строка уведомления: общая для выпадающей панели и страницы «Уведомления». */
export const NotificationItem: React.FC<{ n: AppNotification; onClick: (n: AppNotification) => void }> = ({ n, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(n)}
    className={`w-full text-left p-3.5 flex gap-3 transition-colors hover:bg-surface focus-visible:bg-surface ${
      n.read ? 'opacity-75' : 'bg-brand/5'
    }`}
  >
    {notificationIcon(n)}
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm leading-snug text-ink ${n.read ? 'font-semibold' : 'font-bold'}`}>{n.title}</p>
        <span className="text-[11px] text-muted shrink-0">{formatRelativeTime(n.createdAt)}</span>
      </div>
      <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
    </div>
    {!n.read && <span className="w-2 h-2 rounded-full bg-brand shrink-0 self-center" />}
  </button>
);
