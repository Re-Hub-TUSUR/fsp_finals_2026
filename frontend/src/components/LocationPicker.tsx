import React, { useEffect, useRef } from 'react';
import type { Marker } from '@2gis/mapgl/types';
import { toLngLat, useMapgl } from '../lib/mapgl';
import { MapFallback } from './MapFallback';

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

/** Выбор точки сбора кликом по карте 2GIS. */
export const LocationPicker: React.FC<LocationPickerProps> = ({ lat, lng, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { instance, error } = useMapgl(containerRef, { center: toLngLat(lat, lng), zoom: 13 });

  useEffect(() => {
    if (!instance) return;
    instance.map.on('click', (e) => onChangeRef.current(e.lngLat[1], e.lngLat[0]));
    const marker = new instance.api.Marker(instance.map, { coordinates: toLngLat(lat, lng) });
    markerRef.current = marker;
    return () => {
      marker.destroy();
      markerRef.current = null;
    };
    // Маркер создаётся один раз на карту, дальше двигается через setCoordinates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance]);

  useEffect(() => {
    markerRef.current?.setCoordinates(toLngLat(lat, lng));
    instance?.map.setCenter(toLngLat(lat, lng), { duration: 500 });
    if (instance && instance.map.getZoom() < 15) instance.map.setZoom(15, { duration: 500 });
  }, [instance, lat, lng]);

  return (
    <div className="relative h-64 rounded-xl overflow-hidden border border-slate-300">
      <div ref={containerRef} className="w-full h-full" />
      {error && <MapFallback message={error} />}
    </div>
  );
};
