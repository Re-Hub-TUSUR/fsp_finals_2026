import React from 'react';
import type { SportEvent } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ShieldAlert } from 'lucide-react';

interface EventCardProps {
  event: SportEvent;
}

const SKILL_LABELS: Record<string, string> = {
  NOVICE: 'Новичок',
  AMATEUR: 'Любитель',
  PRO: 'Профи',
  ANY: 'Любой уровень',
};

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const isUnpublished = event.status === 'UNPUBLISHED';

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
      isUnpublished ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
    }`}>
      <div>
        {isUnpublished && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-100 px-2.5 py-1 rounded-lg mb-3">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Снято с публикации админом: {event.unpublishReason || 'Нарушение правил'}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {event.sport.name}
          </span>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {SKILL_LABELS[event.skillLevel] || 'Любой уровень'}
          </span>
        </div>

        <h3 className="font-bold text-slate-900 text-lg leading-snug hover:text-emerald-600 transition-colors">
          <Link to={`/events/${event.id}`}>
            {event.title}
          </Link>
        </h3>

        <p className="text-sm text-slate-600 mt-2 line-clamp-2">
          {event.description}
        </p>

        <div className="mt-4 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{new Date(event.startTime).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{event.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Мест: {event.confirmedCount}/{event.capacity} {event.joinMode === 'APPROVAL' ? '(по заявке)' : '(свободный вход)'}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={event.organizerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
            alt={event.organizerName}
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
            {event.organizerName}
          </span>
        </div>

        <Link
          to={`/events/${event.id}`}
          className="text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          Подробнее
        </Link>
      </div>
    </div>
  );
};
