import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { SportEvent } from '../types';
import { distanceKm, formatDistance, isFull, isMine, routeUrl, startLabelLong, type LatLng } from '../utils/eventView';
import { EventMeter, OrgAvatar } from './EventBits';

interface MapEventCardProps {
  event: SportEvent;
  me: LatLng | null;
  onClose: () => void;
  /** Открыть панель события (на главной); без него кнопки ведут на страницу события */
  onMore?: () => void;
  className?: string;
}

/** Карточка выбранного мероприятия поверх карты (мини-карточка из референса). */
export const MapEventCard: React.FC<MapEventCardProps> = ({ event, me, onClose, onMore, className = '' }) => {
  const full = isFull(event);
  const mine = isMine(event);
  const dist = me ? formatDistance(distanceKm(me, event)) : null;

  const action = mine
    ? { label: event.myParticipation?.status === 'PENDING' ? 'Заявка отправлена' : 'Вы записаны ✓', cls: 'bg-brand-tint text-brand-ink' }
    : full
      ? { label: 'Мест нет', cls: 'bg-surface-2 text-muted' }
      : {
          label: event.joinMode === 'APPROVAL' ? 'Подать заявку' : 'Записаться',
          cls: 'bg-brand text-on-brand hover:bg-brand-hover',
        };

  return (
    <div className={`bg-white border border-line rounded-[22px] shadow-card p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex gap-3 items-start">
        <OrgAvatar event={event} />
        <Link to={`/events/${event.id}`} className="flex-1 min-w-0 flex flex-col gap-0.5 group">
          <span className="text-[13px] font-semibold text-muted">
            {startLabelLong(event)} · {event.sport.name}
          </span>
          <span className="text-lg font-bold leading-tight tracking-[-0.01em] text-ink group-hover:underline decoration-2 underline-offset-2">
            {event.title}
          </span>
          <span className="text-[13px] font-medium text-muted truncate">
            {event.address}
            {dist && ` · ${dist}`}
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="shrink-0 w-9 h-9 rounded-xl bg-surface text-ink flex items-center justify-center hover:bg-surface-2 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={2.4} />
        </button>
      </div>

      <EventMeter event={event} />

      <div className="flex gap-2">
        {onMore ? (
          <button
            type="button"
            onClick={onMore}
            className="flex-1 h-[46px] rounded-[14px] bg-surface text-ink font-semibold text-[15px] flex items-center justify-center hover:bg-surface-2 transition-colors"
          >
            Подробнее
          </button>
        ) : (
          <a
            href={routeUrl(event.lat, event.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-[46px] rounded-[14px] bg-surface text-ink font-semibold text-[15px] flex items-center justify-center hover:bg-surface-2 transition-colors"
          >
            Маршрут
          </a>
        )}
        {onMore && !isMine(event) && !full ? (
          // Запись — через панель события (там анкета организатора и JoinDialog)
          <button
            type="button"
            onClick={onMore}
            className={`flex-[1.4] h-[46px] rounded-[14px] font-bold text-[15px] flex items-center justify-center transition-colors ${action.cls}`}
          >
            {action.label}
          </button>
        ) : (
          <Link
            to={`/events/${event.id}`}
            className={`flex-[1.4] h-[46px] rounded-[14px] font-bold text-[15px] flex items-center justify-center transition-colors ${action.cls}`}
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
};
