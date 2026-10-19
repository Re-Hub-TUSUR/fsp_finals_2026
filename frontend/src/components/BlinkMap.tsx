import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { SportEvent } from '../types';
import { Clock, Users, MapPin, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BlinkMapProps {
  events: SportEvent[];
  selectedEvent: SportEvent | null;
  onSelectEvent: (event: SportEvent | null) => void;
}

// Center of Krasnoyarsk
const KRASNOYARSK_COORDS: [number, number] = [56.0153, 92.8932];

// Helper to format time badge
function formatTimeBadge(startTimeStr: string): string {
  const date = new Date(startTimeStr);
  const now = new Date();
  const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) return 'Идет сейчас';
  if (diffHours < 1) return `через ${Math.max(1, Math.round(diffHours * 60))} мин`;
  if (diffHours < 24) return `через ${Math.round(diffHours)} ч`;
  return 'завтра';
}

// Helper to create Blink-style DivIcon
function createBlinkIcon(event: SportEvent, isSelected: boolean) {
  const timeBadge = formatTimeBadge(event.startTime);
  const spotsLeft = event.capacity - event.confirmedCount;
  const isHot = spotsLeft <= 3 && spotsLeft > 0;

  const html = `
    <div class="blink-pin ${isSelected ? 'scale-110 z-30' : ''}">
      <!-- Top time badge -->
      <div style="background-color: ${isSelected ? '#059669' : '#0f172a'}; color: white;" class="text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap flex items-center gap-1 border border-white/40">
        ${isHot ? '🔥' : '⏱️'} ${timeBadge}
      </div>

      <!-- Main circle bubble -->
      <div class="w-12 h-12 rounded-full overflow-hidden border-2 ${isSelected ? 'border-emerald-500 ring-4 ring-emerald-500/30' : 'border-white'} shadow-lg bg-emerald-600 flex items-center justify-center my-1 relative">
        <img src="${event.organizerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}" class="w-full h-full object-cover" />
      </div>

      <!-- Bottom capacity badge -->
      <div class="text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow bg-white text-slate-800 border border-slate-200">
        ${event.confirmedCount}/${event.capacity} мест
      </div>

      <!-- Arrow tail -->
      <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-800 -mt-0.5"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'blink-custom-marker',
    iconSize: [60, 80],
    iconAnchor: [30, 80],
  });
}

export const BlinkMap: React.FC<BlinkMapProps> = ({ events, selectedEvent, onSelectEvent }) => {
  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <MapContainer
        center={KRASNOYARSK_COORDS}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={createBlinkIcon(event, selectedEvent?.id === event.id)}
            eventHandlers={{
              click: () => onSelectEvent(event),
            }}
          />
        ))}
      </MapContainer>

      {/* Blink-style Bottom Sheet for selected event */}
      {selectedEvent && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200/80 z-[1000] animate-in slide-in-from-bottom duration-200">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {selectedEvent.sport.name}
              </span>
              <h3 className="font-bold text-slate-900 text-lg leading-snug mt-1">
                {selectedEvent.title}
              </h3>
            </div>
            <button
              onClick={() => onSelectEvent(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 line-clamp-2 mb-3">
            {selectedEvent.description}
          </p>

          <div className="flex flex-col gap-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{selectedEvent.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatTimeBadge(selectedEvent.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Свободно: {selectedEvent.capacity - selectedEvent.confirmedCount} из {selectedEvent.capacity} мест</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/events/${selectedEvent.id}`}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              Подробнее и запись
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
