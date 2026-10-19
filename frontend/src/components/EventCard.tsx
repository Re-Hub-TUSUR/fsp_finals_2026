import React from 'react';
import type { SportEvent } from '../types';
import { Link } from 'react-router-dom';
import { Building2, Calendar, MapPin, Users } from 'lucide-react';
import { ParticipationBadge } from './ParticipationBadge';
import { JOIN_MODE_LABELS, SKILL_LABELS, formatPrice, formatShortDateTime, isForeignZone } from '../utils/format';

interface EventCardProps {
  event: SportEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const my = event.myParticipation;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {event.sport.name}
          </span>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {SKILL_LABELS[event.skillLevel]}
          </span>
        </div>

        <h3 className="font-bold text-slate-900 text-lg leading-snug hover:text-emerald-600 transition-colors">
          <Link to={`/events/${event.id}`}>{event.title}</Link>
        </h3>

        {event.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{event.description}</p>}

        <div className="mt-4 space-y-1.5 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {formatShortDateTime(event.startTime, event.timeZone)}
              {isForeignZone(event.timeZone) && <span className="text-slate-400"> (местное{event.cityName ? `, ${event.cityName}` : ''})</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{event.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {event.confirmedCount}/{event.capacity} · {JOIN_MODE_LABELS[event.joinMode].toLowerCase()} ·{' '}
              {formatPrice(event.price).toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img src={event.organizerAvatar} alt="" className="w-7 h-7 rounded-full object-cover bg-slate-200 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{event.organizerName}</span>
          {event.byOrganization && <Building2 className="w-4 h-4 text-slate-400 shrink-0" aria-label="Организация" />}
        </div>

        {my && my.status !== 'CANCELLED' ? (
          <ParticipationBadge status={my.status} />
        ) : (
          <Link
            to={`/events/${event.id}`}
            className="text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            Подробнее
          </Link>
        )}
      </div>
    </div>
  );
};
