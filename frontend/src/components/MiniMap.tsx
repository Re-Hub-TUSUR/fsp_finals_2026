import React, { useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { toLngLat, useMapgl } from '../lib/mapgl';
import { MapFallback } from './MapFallback';
import { routeUrl } from '../utils/eventView';

/** Небольшая статичная карта 2GIS с точкой сбора и ссылкой на маршрут. */
export const MiniMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { instance, error } = useMapgl(containerRef, {
    center: toLngLat(lat, lng),
    zoom: 16,
    pitch: 40,
    zoomControl: false,
  });

  useEffect(() => {
    if (!instance) return;
    const marker = new instance.api.Marker(instance.map, { coordinates: toLngLat(lat, lng) });
    return () => marker.destroy();
  }, [instance, lat, lng]);

  return (
    <div className="relative h-48 rounded-xl overflow-hidden border border-slate-200">
      {/* pointer-events-none — карта только для просмотра */}
      <div ref={containerRef} className="w-full h-full pointer-events-none" />
      {error && <MapFallback message={error} />}
      <a
        href={routeUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow border border-slate-200"
      >
        <Navigation className="w-3.5 h-3.5" /> Маршрут в 2GIS
      </a>
    </div>
  );
};
