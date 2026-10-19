import React from 'react';
import type { SportEvent } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { ParticipationBadge } from './ParticipationBadge';
import { capacityText, formatCardDate, freeSpotsText, splitAddress } from '../utils/eventView';
import { getEventCoverImage } from '../utils/eventCoverImages';

interface EventCardProps {
  event: SportEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const my = event.myParticipation;
  const place = splitAddress(event.address, event.cityName);
  const freeSpots = Math.max(0, event.capacity - event.confirmedCount);
  const spotsPct = event.capacity > 0 ? Math.min(100, Math.max(0, (freeSpots / event.capacity) * 100)) : 0;
  const friends = event.friendsAttending ?? [];
  const friendsCount = friends.length;
  const friendsVisible = friends.slice(0, 3);

  return (
    <div className="anim-rise group flex flex-col justify-between rounded-[22px] bg-card border border-line-2 overflow-hidden shadow-sm hover:shadow-md transition-[box-shadow,border-color] hover:border-brand/40">
      {/* Фото обложка */}
      <div className="relative h-[180px] sm:h-[190px] w-full bg-slate-800 overflow-hidden shrink-0">
        <img
          src={getEventCoverImage(event)}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Бейдж слева: Бесплатно / Цена */}
        <span className="absolute top-3.5 left-3.5 bg-[#04D793] dark:bg-[#D5F45B] text-white dark:text-[#111315] font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-1.5 rounded-full shadow-sm select-none">
          {event.price ? `${event.price.toLocaleString('ru-RU')} ₽` : 'Бесплатно'}
        </span>

        {/* Бейдж справа: Вид спорта */}
        <span className="absolute top-3.5 right-3.5 bg-white/95 dark:bg-card/95 text-slate-900 dark:text-ink font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-1.5 rounded-full shadow-sm select-none">
          {event.sport.name}
        </span>

        {/* Идут / Идет + кружочки аватаров */}
        {friendsCount > 0 && (
          <div className="absolute right-3.5 bottom-3 flex flex-col items-end gap-1 select-none pointer-events-none">
            <span className="text-xs sm:text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {friendsCount === 1 ? 'Идет' : 'Идут'}
            </span>
            <div className="flex -space-x-2" aria-hidden="true">
              {friendsVisible.map((f) => (
                <span
                  key={f.id}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-700 border-2 border-white flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shadow-sm"
                  title={f.fullName}
                >
                  {f.avatarUrl ? (
                    <img src={f.avatarUrl} alt={f.fullName} className="w-full h-full object-cover" />
                  ) : (
                    f.fullName.slice(0, 1).toUpperCase()
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Тело карточки */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1 justify-between">
        <div className="flex flex-col gap-2">
          {/* Спорт и город */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-400 dark:text-muted">
            <span>{event.sport.name}</span>
            {event.cityName && <span>{event.cityName}</span>}
          </div>

          {/* Название */}
          <h3 className="text-lg sm:text-[19px] font-bold text-ink leading-snug line-clamp-2">
            <Link to={`/events/${event.id}`} className="hover:text-brand-ink transition-colors">
              {event.title}
            </Link>
          </h3>

          {/* Дата и время */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-ink">
            <Calendar className="w-4 h-4 text-ink shrink-0" />
            <span>{formatCardDate(event.startTime)}</span>
          </div>

          {/* Место */}
          <div className="flex items-start gap-2 text-ink">
            <MapPin className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-bold text-ink leading-tight truncate">
                {place.main}
              </span>
              {place.sub ? (
                <span className="text-[11px] sm:text-xs text-slate-400 dark:text-muted leading-tight mt-0.5 truncate">
                  {place.sub}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Шкала мест */}
        <div className="pt-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-bold text-[#04D793] dark:text-[#D5F45B]">
              {freeSpotsText(freeSpots)}
            </span>
            <span className="font-medium text-slate-400 dark:text-muted">
              {capacityText(event.capacity)}
            </span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-slate-100 dark:bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#04D793] dark:bg-[#D5F45B] transition-all"
              style={{ width: `${spotsPct}%` }}
            />
          </div>
        </div>

        {/* Кнопка или бейдж участия */}
        <div className="mt-1 flex items-center justify-between gap-2">
          {my && my.status !== 'CANCELLED' ? (
            <ParticipationBadge status={my.status} />
          ) : (
            <Link
              to={`/events/${event.id}`}
              className="w-full py-3 sm:py-3.5 rounded-xl bg-[#04D793] hover:bg-[#03c485] dark:bg-[#D5F45B] dark:hover:bg-[#c4e447] text-white dark:text-[#111315] font-bold text-sm sm:text-base flex items-center justify-center transition-colors shadow-sm text-center"
            >
              Подробнее
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
