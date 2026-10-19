import React from 'react';
import type { SportEvent } from '../types';
import { eventStatus, initials } from '../utils/eventView';

/** Кружок организатора: фото или инициалы на нейтральном фоне; акцентный — для выбранного. */
export const OrgAvatar: React.FC<{ event: SportEvent; size?: number; active?: boolean }> = ({
  event,
  size = 48,
  active = false,
}) => (
  <div
    className={`shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold ${
      active ? 'bg-brand text-on-brand' : 'bg-avatar-bg text-avatar-ink'
    }`}
    style={{ width: size, height: size, fontSize: Math.round(size * 0.31) }}
  >
    {event.organizerAvatar && !active ? (
      <img src={event.organizerAvatar} alt="" className="w-full h-full object-cover" />
    ) : (
      initials(event.organizerName)
    )}
  </div>
);

/** Полоса заполненности + чип статуса («7 из 10», «Осталось 2», «Идёт сейчас», «Мест нет»). */
export const EventMeter: React.FC<{ event: SportEvent; compact?: boolean }> = ({ event, compact = false }) => {
  const status = eventStatus(event);
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex-1 rounded-full bg-surface-2 overflow-hidden ${compact ? 'h-[5px]' : 'h-1.5'}`}>
        <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${status.pct}%` }} />
      </div>
      <span
        className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap rounded-lg ${status.chip} ${
          compact ? 'text-[11px] px-[7px] py-[3px]' : 'text-xs px-2 py-1'
        }`}
      >
        {status.live && status.label === 'Идёт сейчас' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        {status.label}
      </span>
    </div>
  );
};
