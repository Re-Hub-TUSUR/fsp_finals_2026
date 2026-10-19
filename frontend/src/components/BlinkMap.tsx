import React, { useEffect, useRef, useState } from 'react';
import type { SportEvent } from '../types';
import { toLngLat, useMapgl, type LngLat } from '../lib/mapgl';
import {
  PIN_SIZE,
  PIN_SIZE_SELECTED,
  ME_SIZE,
  clusterElement,
  clusterSize,
  meElement,
  pinElement,
} from '../lib/mapPins';
import { distanceKm, type LatLng } from '../utils/eventView';
import { useTheme } from '../context/ThemeContext';
import { MapFallback } from './MapFallback';
import { MapEventCard } from './MapEventCard';
import { Loader2, Minus, Moon, Plus, Sun } from 'lucide-react';

export interface MapViewport extends LatLng {
  radiusKm: number;
}

interface BlinkMapProps {
  events: SportEvent[];
  selectedEvent: SportEvent | null;
  onSelectEvent: (event: SportEvent | null) => void;
  /** Где пользователь (для «я здесь» и расстояний) */
  me: LatLng | null;
  onLocate: (me: LatLng) => void;
  onViewportChange: (viewport: MapViewport) => void;
  /** Позиция колонки кнопок управления (на мобильном — под поиском и чипами) */
  controlsClassName?: string;
  /** Отступ карточки выбранного события снизу (на мобильном — над нижней навигацией) */
  cardClassName?: string;
  /** Показывать мини-карточку выбранного события (на мобильном её заменяет карусель) */
  showCard?: boolean;
  /** «Подробнее» в мини-карточке — открыть панель события */
  onMore?: (event: SportEvent) => void;
  /** Фильтр «Радиус»: круг вокруг точки отсчёта; при смене карта подстраивается под круг */
  radius?: { center: LatLng; km: number } | null;
}

/** Круг радиуса в цвет акцента темы (MapGL принимает только hex) */
const RADIUS_COLORS = {
  light: { fill: '#0BD68A1A', stroke: '#0BD68A' },
  dark: { fill: '#DDF55E1A', stroke: '#DDF55E' },
};

// Center of Krasnoyarsk ([lng, lat] для 2GIS)
const KRASNOYARSK_COORDS: LngLat = [92.8932, 56.0153];
// Радиус склейки меток в кластер (px) и зум, с которого кластеры не нужны
const CLUSTER_RADIUS = 72;
const CLUSTER_MAX_ZOOM = 15.8;
const SELECT_MIN_ZOOM = 15.4;
const PITCH_3D = 50;
const ROTATION_3D = -12;
const FIT_PADDING = { top: 80, right: 80, bottom: 80, left: 80 };

interface Group {
  x: number;
  y: number;
  items: SportEvent[];
  selected: boolean;
}

const groupClass = 'flex flex-col bg-white border border-line rounded-2xl shadow-card overflow-hidden';
const ctrlButton =
  'w-12 h-12 flex items-center justify-center text-ink hover:bg-surface transition-colors disabled:opacity-60 [&+&]:border-t [&+&]:border-line';

const LocateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

export const BlinkMap: React.FC<BlinkMapProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  me,
  onLocate,
  onViewportChange,
  controlsClassName = 'top-4 right-4',
  cardClassName = 'bottom-4',
  showCard = true,
  onMore,
  radius = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectEvent);
  onSelectRef.current = onSelectEvent;
  const onViewportRef = useRef(onViewportChange);
  onViewportRef.current = onViewportChange;
  const lastPinClick = useRef(0);
  const fitted = useRef(false);
  const { theme, toggleTheme } = useTheme();

  const [viewTick, setViewTick] = useState(0);
  const [is3d, setIs3d] = useState(true);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { instance, error } = useMapgl(containerRef, {
    center: KRASNOYARSK_COORDS,
    zoom: 13,
    pitch: PITCH_3D,
    rotation: ROTATION_3D,
    zoomControl: false,
  });

  const selectedId = selectedEvent?.id;

  // Пересчёт кластеров после движения карты; клик по пустому месту снимает выбор
  useEffect(() => {
    if (!instance) return;
    const { map } = instance;
    const onMoveEnd = () => {
      setViewTick((t) => t + 1);
      // Скрытая карта (display: none) не знает своих границ
      if (!containerRef.current?.clientWidth) return;
      const [lng, lat] = map.getCenter();
      const { southWest, northEast } = map.getBounds();
      const center = { lat, lng };
      const corners = [
        { lat: southWest[1], lng: southWest[0] },
        { lat: southWest[1], lng: northEast[0] },
        { lat: northEast[1], lng: southWest[0] },
        { lat: northEast[1], lng: northEast[0] },
      ];
      const radiusKm = Math.max(1, Math.min(300, Math.ceil(Math.max(...corners.map((corner) => distanceKm(center, corner))))));
      onViewportRef.current({ ...center, radiusKm });
    };
    const onClick = () => {
      if (Date.now() - lastPinClick.current > 300) onSelectRef.current(null);
    };
    map.on('moveend', onMoveEnd);
    map.on('click', onClick);
    onMoveEnd();
    return () => {
      map.off('moveend', onMoveEnd);
      map.off('click', onClick);
    };
  }, [instance]);

  // Круг радиуса; при смене радиуса или точки отсчёта показываем круг целиком
  const radiusKey = radius ? `${radius.km}:${radius.center.lat.toFixed(4)}:${radius.center.lng.toFixed(4)}` : '';
  useEffect(() => {
    if (!instance || !radius) return;
    const colors = RADIUS_COLORS[theme];
    const circle = new instance.api.Circle(instance.map, {
      coordinates: toLngLat(radius.center.lat, radius.center.lng),
      radius: radius.km * 1000,
      color: colors.fill,
      strokeColor: colors.stroke,
      strokeWidth: 2,
      interactive: false,
    });
    return () => circle.destroy();
    // radius описан ключом radiusKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, radiusKey, theme]);

  useEffect(() => {
    if (!instance || !radius) return;
    fitted.current = true;
    const dLat = radius.km / 110.57;
    const dLng = radius.km / (111.32 * Math.cos((radius.center.lat * Math.PI) / 180));
    instance.map.fitBounds(
      {
        southWest: [radius.center.lng - dLng, radius.center.lat - dLat],
        northEast: [radius.center.lng + dLng, radius.center.lat + dLat],
      },
      { padding: FIT_PADDING, maxZoom: 16, animation: { duration: 600 } },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, radiusKey]);

  // При первой загрузке показываем все мероприятия
  useEffect(() => {
    if (!instance || fitted.current || events.length === 0) return;
    fitted.current = true;
    if (events.length === 1) {
      instance.map.setCenter(toLngLat(events[0].lat, events[0].lng), { animate: false });
      instance.map.setZoom(15, { animate: false });
      return;
    }
    // Подгоняем в плоском виде, иначе наклон искажает границы
    instance.map.setPitch(0, { animate: false });
    instance.map.setRotation(0, { animate: false });
    const lngs = events.map((e) => e.lng);
    const lats = events.map((e) => e.lat);
    instance.map.fitBounds(
      { southWest: [Math.min(...lngs), Math.min(...lats)], northEast: [Math.max(...lngs), Math.max(...lats)] },
      { padding: FIT_PADDING, maxZoom: 15, animation: { animate: false } },
    );
    // fitBounds сбрасывает наклон — возвращаем 3D-вид из референса (pitch 50 / bearing -12)
    if (is3d) {
      instance.map.setPitch(PITCH_3D, { animate: false });
      instance.map.setRotation(ROTATION_3D, { animate: false });
    }
    // is3d читаем только в момент первой подгонки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, events]);

  // Центрируем выбранное мероприятие и приближаем, чтобы его было видно среди соседей
  useEffect(() => {
    if (!instance || selectedId == null) return;
    const event = events.find((e) => e.id === selectedId);
    if (!event) return;
    instance.map.setCenter(toLngLat(event.lat, event.lng), { duration: 900 });
    if (instance.map.getZoom() < SELECT_MIN_ZOOM) instance.map.setZoom(SELECT_MIN_ZOOM, { duration: 900 });
    // events не в зависимостях: центрируем только при смене выбора
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, selectedId]);

  // Метки и кластеры в экранных координатах
  useEffect(() => {
    if (!instance) return;
    const { api, map } = instance;
    const radius = map.getZoom() >= CLUSTER_MAX_ZOOM ? 0 : CLUSTER_RADIUS;
    const groups: Group[] = [];

    for (const event of events) {
      const [x, y] = map.project(toLngLat(event.lat, event.lng));
      const selected = event.id === selectedId;
      const group =
        radius && !selected ? groups.find((g) => !g.selected && Math.hypot(g.x - x, g.y - y) < radius) : undefined;
      if (group) group.items.push(event);
      else groups.push({ x, y, items: [event], selected });
    }

    const markers = groups.map((group) => {
      if (group.items.length === 1) {
        const event = group.items[0];
        const size = group.selected ? PIN_SIZE_SELECTED : PIN_SIZE;
        const html = pinElement(event, group.selected);
        html.addEventListener('click', () => {
          lastPinClick.current = Date.now();
          onSelectRef.current(event);
        });
        return new api.HtmlMarker(map, {
          coordinates: toLngLat(event.lat, event.lng),
          html,
          anchor: [size / 2, size / 2],
          interactive: true,
          zIndex: group.selected ? 3 : 2,
        });
      }

      const center: LngLat = [
        group.items.reduce((s, e) => s + e.lng, 0) / group.items.length,
        group.items.reduce((s, e) => s + e.lat, 0) / group.items.length,
      ];
      const size = clusterSize(group.items.length);
      const html = clusterElement(group.items);
      html.addEventListener('click', () => {
        lastPinClick.current = Date.now();
        map.setCenter(center, { duration: 600 });
        map.setZoom(Math.min(17, map.getZoom() + 1.8), { duration: 600 });
      });
      return new api.HtmlMarker(map, {
        coordinates: center,
        html,
        anchor: [size / 2, size / 2],
        interactive: true,
        zIndex: 2,
      });
    });

    return () => markers.forEach((m) => m.destroy());
  }, [instance, events, selectedId, viewTick]);

  // Точка «Вы здесь»
  useEffect(() => {
    if (!instance || !me) return;
    const marker = new instance.api.HtmlMarker(instance.map, {
      coordinates: toLngLat(me.lat, me.lng),
      html: meElement(),
      anchor: [ME_SIZE / 2, ME_SIZE / 2],
      interactive: false,
      zIndex: 1,
    });
    return () => marker.destroy();
  }, [instance, me]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const zoomBy = (delta: number) => instance?.map.setZoom(instance.map.getZoom() + delta, { duration: 300 });

  const toggle3d = () => {
    if (!instance) return;
    const next = !is3d;
    instance.map.setPitch(next ? PITCH_3D : 0, { duration: 800 });
    instance.map.setRotation(next ? ROTATION_3D : 0, { duration: 800 });
    setIs3d(next);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setNotice('Браузер не поддерживает геолокацию');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onLocate(coords);
        setLocating(false);
        instance?.map.setCenter(toLngLat(coords.lat, coords.lng), { duration: 700 });
        instance?.map.setZoom(15, { duration: 700 });
      },
      () => {
        setLocating(false);
        setNotice('Не удалось определить местоположение');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#EDEFF3] dark:bg-[#23272B]">
      <div ref={containerRef} className="absolute inset-0" />
      {error && <MapFallback message={error} />}

      {instance && (
        <div className={`absolute z-20 flex flex-col gap-2.5 ${controlsClassName}`}>
          <div className={groupClass}>
            <button
              type="button"
              onClick={toggle3d}
              aria-pressed={is3d}
              aria-label={is3d ? 'Плоская карта' : 'Объёмная карта'}
              className={`${ctrlButton} text-sm font-extrabold ${is3d ? 'text-brand-ink' : ''}`}
            >
              3D
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              className={ctrlButton}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <div className={groupClass}>
            <button type="button" onClick={() => zoomBy(1)} aria-label="Приблизить" className={ctrlButton}>
              <Plus className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => zoomBy(-1)} aria-label="Отдалить" className={ctrlButton}>
              <Minus className="w-5 h-5" />
            </button>
          </div>
          <div className={groupClass}>
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              aria-label="Моё местоположение"
              className={`${ctrlButton} text-brand-ink`}
            >
              {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateIcon />}
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-ink text-white text-sm font-medium rounded-full px-3.5 py-2 shadow-card"
        >
          {notice}
        </div>
      )}

      {showCard && selectedEvent && (
        <MapEventCard
          event={selectedEvent}
          me={me}
          onClose={() => onSelectEvent(null)}
          onMore={onMore ? () => onMore(selectedEvent) : undefined}
          className={`absolute z-30 left-2 right-2 sm:left-4 sm:right-auto sm:w-[380px] ${cardClassName}`}
        />
      )}
    </div>
  );
};
