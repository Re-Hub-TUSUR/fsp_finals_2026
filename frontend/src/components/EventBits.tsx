import React from 'react';
import type { SportEvent } from '../types';
import { eventStatus, initials, plural, seatText } from '../utils/eventView';
import { sportIconPath } from '../utils/sportIcons';

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
          compact ? 'text-caption px-[7px] py-[3px]' : 'text-xs px-2 py-1'
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

export const SportIcon: React.FC<{ name: string; size?: number; strokeWidth?: number; className?: string }> = ({
  name,
  size = 20,
  strokeWidth = 2,
  className,
}) => {
  const d = sportIconPath(name);
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

/** Плоская шкала мест (макет «Карта и Лента»): полоса + статус текстом. width — ширина полосы, иначе растягивается. */
export const SeatLine: React.FC<{ event: SportEvent; width?: number; thick?: boolean; children?: React.ReactNode }> = ({
  event,
  width,
  thick = false,
  children,
}) => {
  const status = eventStatus(event);
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${width ? 'shrink-0' : 'flex-1'} ${thick ? 'h-1.5' : 'h-1'} rounded-xs bg-surface-2 overflow-hidden`}
        style={width ? { width } : undefined}
        aria-hidden="true"
      >
        <div className={`h-full ${status.bar}`} style={{ width: `${status.pct}%` }} />
      </div>
      <span className={`${width ? 'flex-1' : ''} text-sm font-bold whitespace-nowrap ${status.freeInk}`}>{seatText(event)}</span>
      {children}
    </div>
  );
};

/** Чип статуса — только для «особых» состояний (мало мест / идёт / мест нет). */
export const StatusChip: React.FC<{ event: SportEvent; className?: string }> = ({ event, className = '' }) => {
  const status = eventStatus(event);
  if (!status.special) return null;
  return (
    <span className={`inline-flex items-center text-caption font-semibold px-2 py-[3px] rounded-lg whitespace-nowrap ${status.chip} ${className}`}>
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
        <span className="text-label font-medium text-muted">
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
