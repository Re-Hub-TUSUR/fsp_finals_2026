import React from 'react';
import type { SportEvent } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { ParticipationBadge } from './ParticipationBadge';
import { formatPrice, formatShortDateTime, isForeignZone } from '../utils/format';
import { EventCover, CoverBadge, FreeMeter, FriendsAttending } from './EventBits';

interface EventCardProps {
  event: SportEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const my = event.myParticipation;

  return (
    <div className="bg-card rounded-[20px] overflow-hidden shadow-card hover:shadow-lg transition-shadow flex flex-col">
      <EventCover event={event}>
        <CoverBadge className="absolute top-3.5 left-3.5">{formatPrice(event.price)}</CoverBadge>
        <CoverBadge className="absolute top-3.5 right-3.5">{event.sport.name}</CoverBadge>
        <div className="absolute right-4 bottom-4"><FriendsAttending event={event} dark /></div>
      </EventCover>
      <div className="p-[18px] flex flex-col flex-1">
        <div className="text-sm font-medium text-muted">{event.confirmedCount}/{event.capacity}</div>
        <h3 className="mt-2 font-bold text-ink text-[21px] leading-tight hover:text-brand-ink transition-colors"><Link to={`/events/${event.id}`}>{event.title}</Link></h3>
        <div className="mt-4 space-y-2 text-sm text-ink">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {formatShortDateTime(event.startTime, event.timeZone)}
              {isForeignZone(event.timeZone) && <span className="text-slate-400"> (местное{event.cityName ? `, ${event.cityName}` : ''})</span>}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{event.address}</span>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-line"><FreeMeter event={event} /></div>
        <div className="mt-5 flex items-center justify-between gap-2">
          {my && my.status !== 'CANCELLED' ? (
          <ParticipationBadge status={my.status} />
        ) : (
          <Link
            to={`/events/${event.id}`}
            className="w-full text-center text-[17px] font-semibold bg-brand text-on-brand hover:bg-brand-hover px-4 py-3 rounded-[14px] transition-colors"
          >
            Подробнее
          </Link>
        )}
        </div>
      </div>
    </div>
  );
};
