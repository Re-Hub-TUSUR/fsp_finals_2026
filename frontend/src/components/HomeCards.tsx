import React from 'react';
import type { SportEvent } from '../types';
import { distanceKm, formatDistance, priceLabel, rowTime, seatText, eventStatus, type LatLng } from '../utils/eventView';
import { SeatLine } from './EventBits';

const sportKm = (event: SportEvent, me: LatLng | null) =>
  me ? `${event.sport.name} · ${formatDistance(distanceKm(me, event))}` : event.sport.name;

/** Плоский ряд списка рядом с картой (десктоп) и в шторке (мобильный): время слева, статус текстом. */
/** Мемоизирован: при наведении и выборе перерисовываются только два затронутых ряда, а не весь список. */
export const EventRow = React.memo(function EventRow({
  event,
  me,
  active,
  onPick,
  onHover,
  compact = false,
}: {
  event: SportEvent;
  me: LatLng | null;
  active: boolean;
  /** Стабильные колбэки с id: иначе memo не сработает */
  onPick: (id: number) => void;
  onHover?: (id: number | null) => void;
  /** Мобильная шторка: без адреса и полосы мест */
  compact?: boolean;
}) {
  const t = rowTime(event);
  return (
    <button
      type="button"
      data-eid={event.id}
      onClick={() => onPick(event.id)}
      onMouseEnter={onHover && (() => onHover(event.id))}
      onMouseLeave={onHover && (() => onHover(null))}
      aria-pressed={active}
      className={`w-full shrink-0 text-left flex border-b border-line transition-all ${
        compact ? 'gap-3.5 px-4 py-3.5' : 'gap-4 px-5 py-4'
      } ${
        active
          ? 'bg-surface shadow-[inset_3px_0_0_var(--color-brand),0_0_16px_var(--color-brand-glow)]'
          : 'bg-card hover:bg-surface'
      }`}
    >
      <div className={`shrink-0 flex flex-col gap-0.5 ${compact ? 'w-[62px]' : 'w-[68px] pt-px'}`}>
        <span className={`${compact ? 'text-lg' : 'text-xl'} font-bold leading-tight tabular-nums text-ink`}>{t.big}</span>
        <span className="text-label font-semibold text-muted">{t.small}</span>
      </div>
      <div className={`flex-1 min-w-0 flex flex-col ${compact ? 'gap-0.5' : 'gap-[3px]'}`}>
        <span className="text-sm font-semibold text-muted truncate">{sportKm(event, me)}</span>
        <span className="text-lead font-semibold leading-tight text-ink">{event.title}</span>
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
});
