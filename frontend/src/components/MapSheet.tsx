import React from 'react';
import { X } from 'lucide-react';
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
import { useEventJoin } from '../hooks/useEventJoin';
import { Spinner } from './ui';
import { isDemoEvent } from '../utils/tourDemo';

interface MapSheetProps {
  selected: SportEvent | null;
  me: LatLng | null;
  onClearSelection: () => void;
  /** «Подробнее» и запись — через панель события */
  onMore: (event: SportEvent) => void;
  /** После записи из шторки — перечитать список */
  onJoined?: () => void;
}

/** Карточка выбранного события над мобильной картой; без выбора шторки нет. */
export const MapSheet: React.FC<MapSheetProps> = ({ selected, me, onClearSelection, onMore, onJoined }) => {
  if (!selected) return null;
  return (
    <div
      data-tour={isDemoEvent(selected) ? 'demo-card-mobile' : undefined}
      className="lg:hidden absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl bg-card border-t border-line-2 shadow-[0_-6px_20px_rgba(6,12,30,0.18)] pt-4"
    >
      <SelectedPeek event={selected} me={me} onClose={onClearSelection} onMore={() => onMore(selected)} onJoined={onJoined} />
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
  // Демо-событие тура записывает любого: запись там только показывается
  const canJoin = isDemoEvent(event) || (action.joinable && currentUser?.role === 'ROLE_USER' && !event.canManage);
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
          className="shrink-0 w-11 h-11 rounded-control bg-surface text-ink flex items-center justify-center"
        >
          <X className="w-4 h-4" strokeWidth={2.4} />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onMore}
          className="flex-1 h-[50px] rounded-control border border-line-2 bg-card text-ink text-base font-semibold"
        >
          Подробнее
        </button>
        <button
          type="button"
          // Записаться — сразу запись; остальным (гость, организация, статус «вы записаны») — подробности
          onClick={canJoin ? () => void join.start() : onMore}
          disabled={join.busy}
          className={`flex-[1.4] h-[50px] rounded-control text-base font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 ${action.cls}`}
        >
          {join.busy && <Spinner size="sm" />}
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
