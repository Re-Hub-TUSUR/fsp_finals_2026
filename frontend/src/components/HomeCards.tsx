import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import type { SportEvent } from '../types';
import {
  capacityText,
  distanceKm,
  formatCardDate,
  formatDistance,
  freeSpotsText,
  priceLabel,
  rowTime,
  seatText,
  splitAddress,
  eventStatus,
  type LatLng,
} from '../utils/eventView';
import { getEventCoverImage } from '../utils/eventCoverImages';
import { SeatLine } from './EventBits';

const sportKm = (event: SportEvent, me: LatLng | null) =>
  me ? `${event.sport.name} · ${formatDistance(distanceKm(me, event))}` : event.sport.name;

/** Карточка Ленты: по макету с реальной фотографией, бейджами, шкалой мест и кнопкой «Подробнее». */
export const CoverCard: React.FC<{ event: SportEvent; me: LatLng | null; active?: boolean; onOpen: () => void }> = ({
  event,
  me,
  active = false,
  onOpen,
}) => {
  const place = splitAddress(event.address, event.cityName);
  const freeSpots = Math.max(0, event.capacity - event.confirmedCount);
  const spotsPct = event.capacity > 0 ? Math.min(100, Math.max(0, (freeSpots / event.capacity) * 100)) : 0;
  const friends = event.friendsAttending ?? [];
  const friendsCount = friends.length;
  const friendsVisible = friends.slice(0, 3);

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      className={`anim-rise group w-full flex flex-col text-left rounded-[22px] bg-card overflow-hidden cursor-pointer border transition-[box-shadow,border-color] justify-between ${
        active
          ? 'border-brand ring-2 ring-brand/40 shadow-[0_4px_24px_rgba(4,215,147,0.35)] dark:shadow-[0_4px_24px_rgba(213,244,91,0.25)]'
          : 'border-line-2 shadow-sm hover:shadow-md hover:border-brand/40'
      }`}
    >
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
          {/* Спорт и расстояние */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-400 dark:text-muted">
            <span>{event.sport.name}</span>
            {me ? (
              <span>{formatDistance(distanceKm(me, event))} от вас</span>
            ) : event.cityName ? (
              <span>{event.cityName}</span>
            ) : null}
          </div>

          {/* Название */}
          <h3 className="text-lg sm:text-[19px] font-bold text-ink leading-snug line-clamp-2">
            {event.title}
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

        {/* Кнопка Подробнее */}
        <button
          type="button"
          onClick={open}
          className="w-full py-3 sm:py-3.5 rounded-xl bg-[#04D793] hover:bg-[#03c485] dark:bg-[#D5F45B] dark:hover:bg-[#c4e447] text-white dark:text-[#111315] font-bold text-sm sm:text-base flex items-center justify-center transition-colors shadow-sm"
        >
          Подробнее
        </button>
      </div>
    </div>
  );
};

/** Плоский ряд списка рядом с картой (десктоп) и в шторке (мобильный): время слева, статус текстом. */
export const EventRow: React.FC<{
  event: SportEvent;
  me: LatLng | null;
  active: boolean;
  onPick: () => void;
  onHover?: (hovered: boolean) => void;
  /** Мобильная шторка: без адреса и полосы мест */
  compact?: boolean;
}> = ({ event, me, active, onPick, onHover, compact = false }) => {
  const t = rowTime(event);
  return (
    <button
      type="button"
      data-eid={event.id}
      onClick={onPick}
      onMouseEnter={onHover && (() => onHover(true))}
      onMouseLeave={onHover && (() => onHover(false))}
      aria-pressed={active}
      className={`w-full shrink-0 text-left flex border-b border-line transition-all ${
        compact ? 'gap-3.5 px-4 py-3.5' : 'gap-4 px-5 py-4'
      } ${
        active
          ? 'bg-surface shadow-[inset_3px_0_0_var(--color-brand),0_0_16px_rgba(4,215,147,0.2)] dark:shadow-[inset_3px_0_0_var(--color-brand),0_0_16px_rgba(213,244,91,0.15)]'
          : 'bg-card hover:bg-surface'
      }`}
    >
      <div className={`shrink-0 flex flex-col gap-0.5 ${compact ? 'w-[62px]' : 'w-[68px] pt-px'}`}>
        <span className={`${compact ? 'text-lg' : 'text-xl'} font-bold leading-tight tabular-nums text-ink`}>{t.big}</span>
        <span className="text-[13px] font-semibold text-muted">{t.small}</span>
      </div>
      <div className={`flex-1 min-w-0 flex flex-col ${compact ? 'gap-0.5' : 'gap-[3px]'}`}>
        <span className="text-sm font-semibold text-muted truncate">{sportKm(event, me)}</span>
        <span className="text-[17px] font-semibold leading-tight text-ink">{event.title}</span>
        {!compact && <span className="text-sm font-medium text-muted truncate">{event.address}</span>}
        {compact ? (
          <div className="mt-1 flex items-center gap-2.5">
            <span className={`flex-1 text-sm font-bold ${eventStatus(event).freeInk}`}>{seatText(event)}</span>
            <span className="text-sm font-semibold text-ink whitespace-nowrap">{priceLabel(event)}</span>
          </div>
        ) : (
          <div className="mt-1.5">
            <SeatLine event={event} width={72}>
              <span className="text-sm font-semibold text-ink whitespace-nowrap">{priceLabel(event)}</span>
            </SeatLine>
          </div>
        )}
      </div>
    </button>
  );
};
