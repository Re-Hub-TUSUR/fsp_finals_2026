import React from 'react';
import { ChevronRight, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { SportEvent } from '../types';
import {
  distanceKm,
  eventAction,
  eventStatus,
  formatDistance,
  priceLabel,
  seatText,
  startLabelLong,
  type LatLng,
} from '../utils/eventView';
import { EventRow } from './HomeCards';
import { useEventJoin } from './useEventJoin';

export type SheetState = 'peek' | 'half';

interface MapSheetProps {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  events: SportEvent[];
  selected: SportEvent | null;
  me: LatLng | null;
  title: string;
  sub: string;
  onPick: (event: SportEvent) => void;
  onClearSelection: () => void;
  /** «Подробнее» и запись — через панель события */
  onMore: (event: SportEvent) => void;
  /** После записи из шторки — перечитать список */
  onJoined?: () => void;
  onOpenFeed: () => void;
  empty: React.ReactNode;
  listRef: React.Ref<HTMLDivElement>;
}

/**
 * Шторка над мобильной картой (макет «Карта и Лента»): свёрнута — выбранное событие или сводка,
 * полэкрана — список. Полный экран — это «Лента», отдельный режим страницы.
 */
export const MapSheet: React.FC<MapSheetProps> = ({
  state,
  onStateChange,
  events,
  selected,
  me,
  title,
  sub,
  onPick,
  onClearSelection,
  onMore,
  onJoined,
  onOpenFeed,
  empty,
  listRef,
}) => {
  const half = state === 'half';
  const height = half ? '54%' : selected ? '206px' : '108px';

  return (
    <div
      className="lg:hidden absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl bg-card border-t border-line-2 shadow-[0_-6px_20px_rgba(6,12,30,0.18)] overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
      style={{ height }}
    >
      <button
        type="button"
        aria-label={half ? 'Свернуть список' : 'Раскрыть список'}
        aria-expanded={half}
        onClick={() => onStateChange(half ? 'peek' : 'half')}
        className="shrink-0 h-7 flex items-center justify-center"
      >
        <span className="w-10 h-1 rounded-[2px] bg-line-2" />
      </button>

      {!half && selected && <SelectedPeek event={selected} me={me} onClose={onClearSelection} onMore={() => onMore(selected)} onJoined={onJoined} />}

      {!half && !selected && (
        <div className="flex-1 min-h-0 px-4 pb-3.5 flex items-center gap-3">
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-xl font-bold text-ink">{title}</span>
            <span className="text-sm font-medium text-muted truncate">{sub}</span>
          </div>
          <button
            type="button"
            onClick={() => onStateChange('half')}
            className="shrink-0 h-[46px] px-4 rounded-[10px] bg-ink text-page text-base font-bold"
          >
            Список
          </button>
        </div>
      )}

      {half && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 px-4 pb-2.5 flex items-center gap-2.5">
            <div className="flex-1 min-w-0 flex flex-col">
              <span className="text-xl font-bold text-ink">{title}</span>
              <span className="text-sm font-medium text-muted truncate">{sub}</span>
            </div>
            <button
              type="button"
              onClick={onOpenFeed}
              className="shrink-0 h-[42px] pl-3.5 pr-2.5 flex items-center gap-1.5 rounded-[10px] border border-line-2 bg-card text-ink text-[15px] font-semibold"
            >
              Лента
              <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
            </button>
          </div>
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto border-t border-line">
            {events.map((e) => (
              <EventRow key={e.id} event={e} me={me} active={e.id === selected?.id} onPick={() => onPick(e)} compact />
            ))}
            {empty}
          </div>
        </div>
      )}
    </div>
  );
};

const SelectedPeek: React.FC<{
  event: SportEvent;
  me: LatLng | null;
  onClose: () => void;
  onMore: () => void;
  onJoined?: () => void;
}> = ({ event, me, onClose, onMore, onJoined }) => {
  const { currentUser } = useAuth();
  const join = useEventJoin(event, () => onJoined?.());
  const action = eventAction(event);
  const canJoin = action.joinable && currentUser?.role === 'ROLE_USER' && !event.canManage;
  return (
    <div className="flex-1 min-h-0 px-4 pb-3.5 flex flex-col gap-3">
      <div className="flex gap-2.5 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-muted truncate">
            {startLabelLong(event)}
            {me && ` · ${formatDistance(distanceKm(me, event))}`}
          </span>
          <span className="text-lg font-bold leading-tight text-ink line-clamp-2">{event.title}</span>
          <span className={`text-sm font-bold ${eventStatus(event).freeInk}`}>
            {seatText(event)} · <span className="text-ink">{priceLabel(event)}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="shrink-0 w-11 h-11 rounded-[10px] bg-surface text-ink flex items-center justify-center"
        >
          <X className="w-4 h-4" strokeWidth={2.4} />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onMore}
          className="flex-1 h-[50px] rounded-[10px] border border-line-2 bg-card text-ink text-base font-semibold"
        >
          Подробнее
        </button>
        <button
          type="button"
          // Записаться — сразу запись; остальным (гость, организация, статус «вы записаны») — подробности
          onClick={canJoin ? () => void join.start() : onMore}
          disabled={join.busy}
          className={`flex-[1.4] h-[50px] rounded-[10px] text-base font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 ${action.cls}`}
        >
          {join.busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {action.label}
        </button>
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
