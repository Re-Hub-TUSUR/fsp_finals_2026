import React from 'react';
import type { SportEvent } from '../types';
import {
  accessLabel,
  dateFull,
  distanceKm,
  eventAction,
  eventStatus,
  formatDistance,
  seatText,
  priceLabel,
  rowTime,
  splitAddress,
  type LatLng,
} from '../utils/eventView';
import { CoverBadge, EventCover, FriendsAttending, SeatLine, SportIcon } from './EventBits';

const sportKm = (event: SportEvent, me: LatLng | null) =>
  me ? `${event.sport.name} · ${formatDistance(distanceKm(me, event))}` : event.sport.name;

/** Карточка Ленты: прежняя обложка + плоское тело из макета «Карта и Лента». */
export const CoverCard: React.FC<{ event: SportEvent; me: LatLng | null; active?: boolean; onOpen: () => void }> = ({
  event,
  me,
  active = false,
  onOpen,
}) => {
  const place = splitAddress(event.address, event.cityName);
  const action = eventAction(event);
  // Запись — через панель события (там анкета организатора и JoinDialog), поэтому обе кнопки открывают её
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
      className={`anim-rise w-full flex flex-col text-left rounded-xl bg-card overflow-hidden cursor-pointer border transition-colors ${
        active ? 'border-ink' : 'border-line-2 hover:border-ink'
      }`}
    >
      <EventCover event={event}>
        <CoverBadge className="absolute top-3.5 left-3.5">{accessLabel(event)}</CoverBadge>
        <CoverBadge className="absolute top-3.5 right-3.5">{event.sport.name}</CoverBadge>
        <div className="absolute right-4 bottom-4"><FriendsAttending event={event} dark /></div>
      </EventCover>
      <div className="w-full p-4 lg:p-[18px] flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted">
          <SportIcon name={event.sport.name} size={20} />
          <span className="flex-1 min-w-0 truncate text-sm font-semibold">{sportKm(event, me)}</span>
          <span className="text-[15px] font-bold text-ink whitespace-nowrap">{priceLabel(event)}</span>
        </div>
        <span className="text-[19px] lg:text-xl leading-tight font-bold text-ink">{event.title}</span>
        <span className="text-[15px] lg:text-base font-semibold text-ink">{dateFull(event)}</span>
        <span className="text-sm font-medium text-muted">
          {place.main}
          {place.sub && `, ${place.sub}`}
        </span>
        <div className="mt-1">
          <SeatLine event={event} />
        </div>
        <div className="flex gap-2 mt-1.5">
          <button
            type="button"
            onClick={open}
            className="hidden lg:flex flex-1 h-11 rounded-[10px] border border-line-2 bg-card text-ink text-[15px] font-semibold items-center justify-center hover:bg-surface transition-colors"
          >
            Подробнее
          </button>
          <button
            type="button"
            onClick={open}
            className={`flex-1 lg:flex-[1.2] h-12 lg:h-11 rounded-[10px] text-base lg:text-[15px] font-bold flex items-center justify-center transition-colors ${action.cls}`}
          >
            {action.label}
          </button>
        </div>
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
      className={`w-full shrink-0 text-left flex border-b border-line transition-colors ${
        compact ? 'gap-3.5 px-4 py-3.5' : 'gap-4 px-5 py-4'
      } ${active ? 'bg-surface shadow-[inset_3px_0_0_var(--color-ink)]' : 'bg-card hover:bg-surface'}`}
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
