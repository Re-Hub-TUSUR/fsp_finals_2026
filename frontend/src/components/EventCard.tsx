import React from 'react';
import type { SportEvent } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { ParticipationBadge } from './ParticipationBadge';
import { buttonClasses } from './ui';
import { cn } from '../utils/cn';
import { formatPrice } from '../utils/format';
import { capacityText, formatCardDate, freeSpotsText, splitAddress } from '../utils/eventView';
import { getEventCoverImage } from '../utils/eventCoverImages';

const ctaClass = buttonClasses({ size: 'lg', block: true, className: 'py-3 sm:py-3.5 text-sm sm:text-base font-bold' });
const coverBadge = 'font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-1.5 rounded-full shadow-sm select-none';

export interface EventCardProps {
  event: SportEvent;
  /** Правая часть строки с видом спорта; по умолчанию — город. */
  meta?: React.ReactNode;
  /** Кнопка поверх обложки рядом с бейджем вида спорта (например, «Не интересно»). */
  coverAction?: React.ReactNode;
  /** Дополнительный блок под адресом (например, причины рекомендации). */
  children?: React.ReactNode;
  /**
   * Вызывается при открытии мероприятия. Если задан `onSelect`, вся карточка кликабельна
   * и открывает детали на месте; иначе заголовок и кнопка ведут на страницу мероприятия.
   */
  onOpen?: () => void;
  onSelect?: () => void;
  /** Подсветка выбранной карточки (Лента рядом с панелью деталей). */
  active?: boolean;
  as?: 'div' | 'article';
}

/** Карточка мероприятия с фото-обложкой: Лента, рекомендации, профиль. */
export const EventCard: React.FC<EventCardProps> = ({
  event,
  meta,
  coverAction,
  children,
  onOpen,
  onSelect,
  active = false,
  as: Root = 'div',
}) => {
  const my = event.myParticipation;
  const place = splitAddress(event.address, event.cityName);
  const freeSpots = Math.max(0, event.capacity - event.confirmedCount);
  const spotsPct = event.capacity > 0 ? Math.min(100, Math.max(0, (freeSpots / event.capacity) * 100)) : 0;
  const friends = event.friendsAttending ?? [];
  const href = `/events/${event.id}`;

  const selectable = onSelect
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: onSelect,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        },
      }
    : {};

  return (
    <Root
      {...selectable}
      className={cn(
        'anim-rise group flex flex-col justify-between text-left rounded-card bg-card border overflow-hidden transition-[box-shadow,border-color]',
        onSelect && 'w-full cursor-pointer',
        active ? 'border-brand ring-2 ring-brand/40 shadow-glow-lg' : 'border-line-2 shadow-sm hover:shadow-md hover:border-brand/40',
      )}
    >
      {/* Фото обложка */}
      <div className="relative h-[180px] sm:h-[190px] w-full bg-slate-800 overflow-hidden shrink-0">
        <img
          src={getEventCoverImage(event)}
          onError={(ev) => (ev.currentTarget.style.visibility = 'hidden')}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        <span className={cn('absolute top-3.5 left-3.5 bg-brand text-on-brand', coverBadge)}>{formatPrice(event.price)}</span>

        <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
          <span className={cn('bg-white/95 dark:bg-card/95 text-slate-900 dark:text-ink', coverBadge)}>{event.sport.name}</span>
          {coverAction}
        </div>

        {friends.length > 0 && <FriendsOnCover friends={friends} />}
      </div>

      {/* Тело карточки */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1 justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-400 dark:text-muted">
            <span>{event.sport.name}</span>
            {meta ?? (event.cityName && <span>{event.cityName}</span>)}
          </div>

          <h3 className="text-lg sm:text-title font-bold text-ink leading-snug line-clamp-2">
            {onSelect ? (
              event.title
            ) : (
              <Link to={href} onClick={onOpen} className="hover:text-brand-ink transition-colors">
                {event.title}
              </Link>
            )}
          </h3>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-ink">
            <Calendar className="w-4 h-4 text-ink shrink-0" />
            <span>{formatCardDate(event.startTime, event.timeZone)}</span>
          </div>

          <div className="flex items-start gap-2 text-ink">
            <MapPin className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-bold text-ink leading-tight truncate">{place.main}</span>
              {place.sub ? (
                <span className="text-caption sm:text-xs text-slate-400 dark:text-muted leading-tight mt-0.5 truncate">
                  {place.sub}
                </span>
              ) : null}
            </div>
          </div>

          {children}
        </div>

        {/* Шкала мест */}
        <div className="pt-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-bold text-brand">{freeSpotsText(freeSpots)}</span>
            <span className="font-medium text-slate-400 dark:text-muted">{capacityText(event.capacity)}</span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-slate-100 dark:bg-surface-2 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${spotsPct}%` }} />
          </div>
        </div>

        {/* Кнопка или бейдж участия */}
        {onSelect ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={ctaClass}
          >
            Подробнее
          </button>
        ) : my && my.status !== 'CANCELLED' ? (
          <div className="mt-1">
            <ParticipationBadge status={my.status} />
          </div>
        ) : (
          <Link to={href} onClick={onOpen} className={ctaClass}>
            Подробнее
          </Link>
        )}
      </div>
    </Root>
  );
};

/** «Идут» + до трёх аватаров друзей в углу обложки. */
const FriendsOnCover: React.FC<{ friends: NonNullable<SportEvent['friendsAttending']> }> = ({ friends }) => (
  <div className="absolute right-3.5 bottom-3 flex flex-col items-end gap-1 select-none pointer-events-none">
    <span className="text-xs sm:text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
      {friends.length === 1 ? 'Идет' : 'Идут'}
    </span>
    <div className="flex -space-x-2" aria-hidden="true">
      {friends.slice(0, 3).map((f) => (
        <span
          key={f.id}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-700 border-2 border-white flex items-center justify-center text-micro sm:text-xs font-bold text-white shadow-sm"
          title={f.fullName}
        >
          {f.avatarUrl ? (
            <img src={f.avatarUrl} alt={f.fullName} loading="lazy" width={32} height={32} className="w-full h-full object-cover" />
          ) : (
            f.fullName.slice(0, 1).toUpperCase()
          )}
        </span>
      ))}
    </div>
  </div>
);
