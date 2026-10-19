import React from 'react';
import type { SportEvent } from '../types';
import { eventStatus, initials, plural } from '../utils/eventView';

/** Кружок организатора: фото сохраняется и у выбранного события, иначе показываются инициалы. */
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
    {event.organizerAvatar ? (
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

/** Overlapping avatars of the current viewer's confirmed friends going to the event. */
export const FriendsAttending: React.FC<{ event: SportEvent; dark?: boolean }> = ({ event, dark = false }) => {
  const friends = event.friendsAttending ?? [];
  if (!friends.length) return null;
  const visible = friends.slice(0, 3);
  return (
    <div className={`flex items-center gap-2 ${dark ? 'text-white' : 'text-ink'}`} title={friends.map((friend) => friend.fullName).join(', ')}>
      <div className="flex -space-x-2.5" aria-hidden="true">
        {visible.map((friend) => (
          <span key={friend.id} className="w-10 h-10 rounded-full overflow-hidden bg-avatar-bg border-2 border-[#1b1d1f] flex items-center justify-center text-xs font-bold text-avatar-ink">
            {friend.avatarUrl ? <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" /> : friend.fullName.slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="text-sm font-medium">Идут{friends.length > 3 ? ` · ${friends.length}` : ''}</span>
    </div>
  );
};

/* ---------- Sportikus Home: иконки спорта, обложка, шкала мест ---------- */

// Пиктограммы видов спорта из макета (stroke 24×24)
const SPORT_ICON_PATHS: [RegExp, string][] = [
  [/футбол/i, 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 8l3.8 2.8-1.4 4.4H9.6L8.2 10.8Z M12 8V3.2 M15.8 10.8l4.4-1.4 M14.4 15.2l2.7 3.8 M9.6 15.2l-2.7 3.8 M8.2 10.8 3.8 9.4'],
  [/бег|ходьб|марафон|трейл/i, 'M14.5 4.2a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0 M6 9l3.5-2 4 1.2 2.5 3.6 3 .7 M13.5 8.2l-2.3 5 3.3 2.6-1 5.2 M11.2 13.2 9 17H4.5'],
  [/баскет|стритбол/i, 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M3 12h18 M12 3v18 M5.6 5.6c2.6 3.4 2.6 9.4 0 12.8 M18.4 5.6c-2.6 3.4-2.6 9.4 0 12.8'],
  [/волейб/i, 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 12c-1-3.5-.5-6.5 1.5-8.8 M12 12c3.6.6 6.3 2.3 8 4.6 M12 12c-2.6 2.5-5.6 3.6-8.6 3.2 M7.6 4.2c3.2 1.4 5.8 4 6.6 7 M20.6 9.6c-3 1.6-6.6 2-9.4 1.2'],
  [/падел/i, 'M10 3a6 6 0 1 1 0 12a6 6 0 1 1 0-12Z M14.3 13.6 20.5 20 M8 7.5h.01 M11.5 7.5h.01 M9.7 10.5h.01 M13 10.5h.01 M6.6 10.5h.01'],
  [/теннис/i, 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M5.2 6.2c3 3.2 3 8.4 0 11.6 M18.8 6.2c-3 3.2-3 8.4 0 11.6'],
  [/йога|растяж|пилатес/i, 'M10.3 4.6a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0 M12 8.6v5.4 M6 11.6l6-2 6 2 M4 19c2.5-2.4 5.5-3 8-3s5.5.6 8 3 M8 19l4-2.6 4 2.6'],
  [/вело/i, 'M2.5 16.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M14.5 16.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M6 16.5 9.5 9h6l2.5 7.5 M9.5 9l2.5 7.5 3.5-7.5 M8 6h3.5 M15.5 9l-1-3h2'],
];
// Запасная пиктограмма — кубок
const FALLBACK_ICON = 'M8 4h8v5a4 4 0 0 1-8 0Z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8 20h8 M10 17h4';

export const SportIcon: React.FC<{ name: string; size?: number; strokeWidth?: number; className?: string }> = ({
  name,
  size = 20,
  strokeWidth = 2,
  className,
}) => {
  const d = SPORT_ICON_PATHS.find(([re]) => re.test(name))?.[1] ?? FALLBACK_ICON;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
};

/** Обложка карточки: пока организаторы не загружают фото — акцентная заливка с пиктограммой спорта. */
export const EventCover: React.FC<{ event: SportEvent; height?: number; children?: React.ReactNode }> = ({
  event,
  height = 170,
  children,
}) => (
  <div className="relative w-full shrink-0 bg-brand text-on-brand overflow-hidden" style={{ height }}>
    <SportIcon
      name={event.sport.name}
      size={Math.round(height * 0.62)}
      strokeWidth={1.4}
      className="absolute -right-3 -bottom-4 opacity-25"
    />
    <SportIcon name={event.sport.name} size={36} strokeWidth={1.8} className="absolute left-4 bottom-4" />
    {children}
  </div>
);

/** Бейдж поверх обложки («Бесплатно», «Платно · 500 ₽», вид спорта). */
export const CoverBadge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-sm font-medium leading-none px-4 py-2.5 rounded-full bg-card text-ink shadow-[0_2px_8px_rgba(6,12,30,0.14)] ${className}`}
  >
    {children}
  </span>
);

/** Компактная шкала: полоса + «Свободно N» цветом статуса. */
export const FreeMeter: React.FC<{ event: SportEvent }> = ({ event }) => {
  const status = eventStatus(event);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0 h-1 rounded-full bg-surface-2 overflow-hidden">
        <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${status.pct}%` }} />
      </div>
      <span className={`shrink-0 text-[13px] font-bold whitespace-nowrap ${status.freeInk}`}>{status.freeShort}</span>
    </div>
  );
};

/** Чип статуса — только для «особых» состояний (мало мест / идёт / мест нет). */
export const StatusChip: React.FC<{ event: SportEvent; className?: string }> = ({ event, className = '' }) => {
  const status = eventStatus(event);
  if (!status.special) return null;
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-[3px] rounded-lg whitespace-nowrap ${status.chip} ${className}`}>
      {status.label}
    </span>
  );
};

/** Места в панели деталей: до 16 мест — сегменты по одному месту, больше — полоса. */
export const SeatMeter: React.FC<{ event: SportEvent }> = ({ event }) => {
  const status = eventStatus(event);
  const taken = Math.min(event.confirmedCount, event.capacity);
  const left = Math.max(0, event.capacity - taken);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-base font-bold ${status.freeInk}`}>
          {left === 0 ? 'Мест нет' : `${left} ${plural(left, 'место свободно', 'места свободно', 'мест свободно')}`}
        </span>
        <span className="text-[13px] font-medium text-muted">
          занято {taken} из {event.capacity}
        </span>
      </div>
      {event.capacity <= 16 ? (
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: event.capacity }, (_, i) => (
            <span key={i} className={`flex-1 h-2 rounded-full ${i < taken ? status.bar : 'bg-surface-2'}`} />
          ))}
        </div>
      ) : (
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
          <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${status.pct}%` }} />
        </div>
      )}
    </div>
  );
};
