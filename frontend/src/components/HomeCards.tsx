import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import type { SportEvent } from '../types';
import {
  accessLabel,
  dateFull,
  distanceKm,
  eventStatus,
  formatDistance,
  splitAddress,
  startLabel,
  type LatLng,
} from '../utils/eventView';
import { CoverBadge, EventCover, FreeMeter, FriendsAttending, SportIcon, StatusChip } from './EventBits';

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
  </svg>
);

const distFrom = (event: SportEvent, me: LatLng | null) => (me ? `${formatDistance(distanceKm(me, event))} от вас` : '');

/** Карточка списка с обложкой (Sportikus Home). */
export const CoverCard: React.FC<{ event: SportEvent; me: LatLng | null; active?: boolean; onOpen: () => void }> = ({
  event,
  me,
  active = false,
  onOpen,
}) => {
  const place = splitAddress(event.address, event.cityName);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full flex flex-col text-left rounded-[20px] bg-card overflow-hidden transition-shadow hover:shadow-card ring-2 ${
        active ? 'ring-brand' : 'ring-transparent'
      }`}
    >
      <EventCover event={event}>
        <CoverBadge className="absolute top-3.5 left-3.5">{accessLabel(event)}</CoverBadge>
        <CoverBadge className="absolute top-3.5 right-3.5">{event.sport.name}</CoverBadge>
        <div className="absolute right-4 bottom-4"><FriendsAttending event={event} dark /></div>
      </EventCover>
      <div className="w-full px-[18px] pt-3.5 pb-[18px] flex flex-col gap-2">
        <div className="text-sm leading-tight font-medium text-muted">
          <span className="whitespace-nowrap">{distFrom(event, me)}</span>
        </div>
        <span className="text-[21px] leading-tight font-bold tracking-[-0.015em] text-ink">{event.title}</span>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink mt-0.5">
          <CalendarIcon />
          <span>{dateFull(event)}</span>
        </div>
        <div className="flex items-start gap-2 mt-1">
          <MapPin className="w-[18px] h-[18px] text-muted shrink-0" />
          <div className="min-w-0 flex flex-col gap-[3px]">
            <span className="text-sm font-medium leading-snug text-ink">{place.main}</span>
            {place.sub && <span className="text-[13px] font-medium leading-snug text-muted">{place.sub}</span>}
          </div>
        </div>
      </div>
    </button>
  );
};

/** Плашка с пиктограммой спорта, цвет — по статусу. */
const SportTile: React.FC<{ event: SportEvent; size?: number }> = ({ event, size = 40 }) => {
  const status = eventStatus(event);
  const tone = status.special ? status.chip : 'bg-surface text-ink';
  return (
    <span className={`shrink-0 rounded-[13px] flex items-center justify-center ${tone}`} style={{ width: size, height: size }}>
      <SportIcon name={event.sport.name} size={Math.round(size * 0.5)} />
    </span>
  );
};

/** Компактная карточка в колонке рядом с картой (десктоп). */
export const CompactCard: React.FC<{ event: SportEvent; me: LatLng | null; active: boolean; onPick: () => void }> = ({
  event,
  me,
  active,
  onPick,
}) => (
  <button
    type="button"
    data-eid={event.id}
    onClick={onPick}
    aria-pressed={active}
    className={`w-full text-left flex gap-3 p-3.5 rounded-[18px] border-[1.5px] transition-colors ${
      active ? 'bg-brand-tint border-brand' : 'bg-card border-line hover:border-surface-2'
    }`}
  >
    <SportTile event={event} />
    <div className="flex-1 min-w-0 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted truncate">
          {event.sport.name}
          {me && ` · ${formatDistance(distanceKm(me, event))}`}
        </span>
        <StatusChip event={event} />
      </div>
      <span className="text-base font-bold leading-tight text-ink">{event.title}</span>
      <span className="text-[13px] font-medium text-muted">{startLabel(event)}</span>
      <div className="mt-1">
        <FreeMeter event={event} />
      </div>
    </div>
  </button>
);

/** Карточка карусели поверх мобильной карты. */
export const CarouselCard: React.FC<{
  event: SportEvent;
  active: boolean;
  onPick: () => void;
  onMore: () => void;
}> = ({ event, active, onPick, onMore }) => (
  <div
    data-eid={event.id}
    onClick={onPick}
    className={`shrink-0 w-[290px] snap-start flex items-center gap-3 p-3 rounded-[20px] bg-white border-2 shadow-card cursor-pointer transition-colors ${
      active ? 'border-brand' : 'border-white'
    }`}
  >
    <SportTile event={event} />
    <div className="flex-1 min-w-0 flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted truncate">
        {startLabel(event)} · {event.sport.name}
      </span>
      <span className="text-[15px] font-bold leading-tight text-ink truncate">{event.title}</span>
      <div className="mt-0.5">
        <FreeMeter event={event} />
      </div>
    </div>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onMore();
      }}
      aria-label="Подробнее"
      className="shrink-0 w-11 h-11 rounded-[14px] bg-surface text-ink flex items-center justify-center hover:bg-surface-2"
    >
      <ChevronRight className="w-5 h-5" />
    </button>
  </div>
);
