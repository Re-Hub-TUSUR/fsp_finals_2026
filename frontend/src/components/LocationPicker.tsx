import React from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

const PIN = L.divIcon({
  html: '<div style="font-size:34px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">📍</div>',
  className: '',
  iconSize: [0, 0],
});

const ClickHandler: React.FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
};

/** Выбор точки сбора кликом по карте (OpenStreetMap, без платных API). */
export const LocationPicker: React.FC<LocationPickerProps> = ({ lat, lng, onChange }) => (
  <div className="h-64 rounded-xl overflow-hidden border border-slate-300">
    <MapContainer center={[lat, lng]} zoom={13} scrollWheelZoom className="w-full h-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onChange} />
      <Marker position={[lat, lng]} icon={PIN} />
    </MapContainer>
  </div>
);
