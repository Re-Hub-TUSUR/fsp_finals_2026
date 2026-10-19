import React from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';

const PIN = L.divIcon({
  html: '<div style="font-size:32px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">📍</div>',
  className: '',
  iconSize: [0, 0],
});

/** Небольшая статичная карта с точкой сбора. */
export const MiniMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => (
  <div className="h-48 rounded-xl overflow-hidden border border-slate-200">
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      zoomControl={false}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={PIN} />
    </MapContainer>
  </div>
);
