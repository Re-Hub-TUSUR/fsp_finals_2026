import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import type { SportEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { distanceKm, eventAction, formatDistance, routeUrl, startLabelLong, type LatLng } from '../utils/eventView';
import { SeatLine } from './EventBits';
import { useEventJoin } from './useEventJoin';
import { isDemoEvent } from '../utils/tourDemo';

interface MapEventCardProps {
  event: SportEvent;
  me: LatLng | null;
  onClose: () => void;
  /** Открыть панель события (на главной); без него кнопки ведут на страницу события */
  onMore?: () => void;
  /** После записи — перечитать список, чтобы обновились места и статусы */
  onJoined?: () => void;
  className?: string;
}

/** Карточка выбранного мероприятия поверх карты (мини-карточка из референса). */
export const MapEventCard: React.FC<MapEventCardProps> = ({ event, me, onClose, onMore, onJoined, className = '' }) => {
  const { currentUser } = useAuth();
  const join = useEventJoin(event, () => onJoined?.());
  const action = eventAction(event);
  // Записаться может только пользователь; остальным (организация, админ, организатор события) — страница события
  const demo = isDemoEvent(event);
  // Демо-событие тура записывает любого: запись там только показывается
  const canJoin = demo || (action.joinable && !!onMore && currentUser?.role === 'ROLE_USER' && !event.canManage);
  const dist = me ? formatDistance(distanceKm(me, event)) : null;
  const secondary =
    'flex-1 h-12 rounded-[10px] border border-line-2 bg-card text-ink font-semibold text-base flex items-center justify-center hover:bg-surface transition-colors';
  const primary = `flex-[1.4] h-12 rounded-[10px] font-bold text-base flex items-center justify-center transition-colors ${action.cls}`;

  return (
    <div
      data-tour={demo ? 'demo-card' : undefined}
      className={`bg-card border border-line-2 rounded-xl shadow-[0_4px_16px_rgba(20,30,45,0.14)] p-4 flex flex-col gap-2.5 ${className}`}
    >
      <div className="flex gap-2.5 items-start">
        <Link
          to={`/events/${event.id}`}
          // У демо-события нет страницы
          onClick={demo ? (e) => e.preventDefault() : undefined}
          className="flex-1 min-w-0 flex flex-col gap-[3px] group"
        >
          <span className="text-sm font-semibold text-muted">
            {startLabelLong(event)} · {event.sport.name}
          </span>
          <span className="text-[19px] font-bold leading-tight text-ink group-hover:underline decoration-2 underline-offset-2">
            {event.title}
          </span>
          <span className="text-sm font-medium text-muted truncate">
            {event.address}
            {dist && ` · ${dist}`}
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="shrink-0 w-10 h-10 rounded-lg bg-surface text-ink flex items-center justify-center hover:bg-surface-2 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={2.4} />
        </button>
      </div>

      <SeatLine event={event} thick />

      <div className="flex gap-2">
        {onMore ? (
          <button type="button" onClick={onMore} className={secondary}>
            Подробнее
          </button>
        ) : (
          <a href={routeUrl(event.lat, event.lng)} target="_blank" rel="noopener noreferrer" className={secondary}>
            Маршрут
          </a>
        )}
        {canJoin ? (
          <button type="button" onClick={() => void join.start()} disabled={join.busy} className={`${primary} gap-2 disabled:opacity-70`}>
            {join.busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {action.label}
          </button>
        ) : (
          <Link to={`/events/${event.id}`} className={primary}>
            {action.joinable && currentUser?.role !== 'ROLE_USER' && currentUser ? 'Открыть' : action.label}
          </Link>
        )}
      </div>
      {join.error && (
        <p role="alert" className="text-sm text-red-700">
          {join.error}
        </p>
      )}
      {join.dialog}
    </div>
  );
};
