import React from 'react';
import { MapPinOff } from 'lucide-react';

/** Заглушка поверх контейнера карты, если 2GIS недоступен (нет ключа, сеть). */
export const MapFallback: React.FC<{ message: string }> = ({ message }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500 text-sm p-4 text-center">
    <MapPinOff className="w-6 h-6" />
    <span>Карта недоступна: {message}</span>
  </div>
);
