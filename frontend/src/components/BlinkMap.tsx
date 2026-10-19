import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { SportEvent } from '../types';
import { Clock, Users, MapPin, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ParticipationBadge } from './ParticipationBadge';
import { JOIN_MODE_LABELS, formatPrice, formatTimeBadge, spotsLeft } from '../utils/format';

export interface MapViewport {
  lat: number;
  lng: number;
  radiusKm: number;
}

interface BlinkMapProps {
  events: SportEvent[];
  selectedEvent: SportEvent | null;
  onSelectEvent: (event: SportEvent | null) => void;
  /** Куда центрировать карту (домашний город или геолокация). Смена значения перемещает карту. */
  center: [number, number];
  /** Видимая область изменилась — каталог подгружает события только для неё. */
  onViewportChange?: (viewport: MapViewport) => void;
}

const MAX_VIEWPORT_RADIUS_KM = 300;

/** Перемещает карту к новому центру и сообщает видимую область (центр + радиус до угла). */
const MapController: React.FC<{ center: [number, number]; onViewportChange?: (v: MapViewport) => void }> = ({
  center,
  onViewportChange,
}) => {
  const map = useMap();
  const callback = useRef(onViewportChange);
  callback.current = onViewportChange;

  const report = () => {
    const c = map.getCenter();
    const radiusKm = Math.min(MAX_VIEWPORT_RADIUS_KM, map.distance(c, map.getBounds().getNorthEast()) / 1000);
    callback.current?.({ lat: c.lat, lng: c.lng, radiusKm: Math.max(1, Math.round(radiusKm)) });
  };

  useMapEvents({ moveend: report });

  useEffect(() => {
    map.setView(center, map.getZoom());
    report();
  }, [center[0], center[1]]);

  return null;
};
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120';

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Helper to create Blink-style DivIcon
function createBlinkIcon(event: SportEvent, isSelected: boolean) {
  const timeBadge = formatTimeBadge(event.startTime, event.endTime, event.timeZone);
  const left = spotsLeft(event);
  const isHot = left <= 3 && left > 0;

  const html = `
    <div class="blink-pin ${isSelected ? 'scale-110 z-30' : ''}">
      <!-- Top time badge -->
      <div style="background-color: ${isSelected ? '#059669' : '#0f172a'}; color: white;" class="text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap flex items-center gap-1 border border-white/40">
        ${isHot ? '🔥' : '⏱️'} ${timeBadge}
      </div>

      <!-- Main circle bubble -->
      <div class="w-12 h-12 rounded-full overflow-hidden border-2 ${isSelected ? 'border-emerald-500 ring-4 ring-emerald-500/30' : 'border-white'} shadow-lg bg-emerald-600 flex items-center justify-center my-1 relative">
        <img src="${escapeAttr(event.organizerAvatar || FALLBACK_AVATAR)}" alt="" class="w-full h-full object-cover" />
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

export const BlinkMap: React.FC<BlinkMapProps> = ({ events, selectedEvent, onSelectEvent, center, onViewportChange }) => {
  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <MapContainer center={center} zoom={12} scrollWheelZoom={true} className="w-full h-full">
        <MapController center={center} onViewportChange={onViewportChange} />
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
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200/80 z-[1000]">
          <div className="flex justify-between items-start mb-2 gap-2">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {selectedEvent.sport.name}
              </span>
              <h3 className="font-bold text-slate-900 text-lg leading-snug mt-1">{selectedEvent.title}</h3>
            </div>
            <button
              onClick={() => onSelectEvent(null)}
              aria-label="Закрыть"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedEvent.description && (
            <p className="text-sm text-slate-600 line-clamp-2 mb-3">{selectedEvent.description}</p>
          )}

          <div className="flex flex-col gap-1.5 text-sm text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{selectedEvent.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{formatTimeBadge(selectedEvent.startTime, selectedEvent.endTime, selectedEvent.timeZone)}</span>
              <span className="text-slate-300">·</span>
              <span>{formatPrice(selectedEvent.price)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Свободно: {spotsLeft(selectedEvent)} из {selectedEvent.capacity} · {JOIN_MODE_LABELS[selectedEvent.joinMode].toLowerCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/events/${selectedEvent.id}`}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-3 rounded-xl text-sm text-center flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              {selectedEvent.myParticipation && selectedEvent.myParticipation.status !== 'CANCELLED'
                ? 'Открыть мероприятие'
                : selectedEvent.joinMode === 'APPROVAL'
                  ? 'Подробнее и заявка'
                  : 'Подробнее и запись'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            {selectedEvent.myParticipation && selectedEvent.myParticipation.status !== 'CANCELLED' && (
              <ParticipationBadge status={selectedEvent.myParticipation.status} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
