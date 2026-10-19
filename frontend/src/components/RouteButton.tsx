import React, { useEffect, useRef, useState } from 'react';
import { Navigation } from 'lucide-react';
import { routeLinks } from '../utils/eventView';

/**
 * Кнопка «Маршрут»: по нажатию раскрывает ссылки на построение маршрута в 2GIS, Яндекс Картах и Google Maps.
 * Список раскрывается на месте, а не всплывающим окном — родительские панели с прокруткой обрезали бы его.
 */
export const RouteButton: React.FC<{ lat: number; lng: number; className?: string }> = ({ lat, lng, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`flex flex-col items-start gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl bg-surface text-ink text-sm font-semibold hover:bg-surface-2 transition-colors"
      >
        <Navigation className="w-4 h-4" /> Маршрут
      </button>
      {open && (
        <div className="anim-drop flex flex-wrap gap-1.5" role="group" aria-label="Открыть маршрут в приложении">
          {routeLinks(lat, lng).map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="h-9 px-3 inline-flex items-center rounded-xl border border-line bg-white text-sm font-semibold text-brand-ink hover:bg-surface transition-colors"
            >
              {l.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
