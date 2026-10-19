import { useEffect, useRef, useState, type RefObject } from 'react';
import { load } from '@2gis/mapgl';
import type { Map as MapglMap, MapOptions } from '@2gis/mapgl/types';
import { useTheme, type Theme } from '../context/ThemeContext';

/**
 * Интеграция с 2GIS MapGL JS API (https://docs.2gis.com/ru/mapgl).
 * SDK подгружается скриптом с CDN 2GIS один раз на всё приложение.
 * Ключ — VITE_2GIS_KEY, свой стиль из редактора https://styles.2gis.com — VITE_2GIS_STYLE_ID.
 */

export type Mapgl = Awaited<ReturnType<typeof load>>;

export const MAPGL_KEY: string = import.meta.env.VITE_2GIS_KEY ?? '';
export const MAPGL_STYLE_ID: string = import.meta.env.VITE_2GIS_STYLE_ID ?? '';
// Тёмный стиль (тоже из редактора 2GIS); без него в тёмной теме остаётся светлая карта
export const MAPGL_STYLE_ID_DARK: string = import.meta.env.VITE_2GIS_STYLE_ID_DARK ?? '';

// Цвет подложки, пока грузится стиль (земля из референса)
const MAP_BG: Record<Theme, string> = { light: '#EDEFF3', dark: '#23272B' };

/** Координаты в формате 2GIS: [долгота, широта]. */
export type LngLat = [number, number];

let loading: Promise<Mapgl> | null = null;

export function loadMapgl(): Promise<Mapgl> {
  if (!loading) {
    loading = load().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export interface MapglInstance {
  api: Mapgl;
  map: MapglMap;
}

type InitOptions = Omit<MapOptions, 'key'>;

const styleFor = (theme: Theme) => (theme === 'dark' && MAPGL_STYLE_ID_DARK ? MAPGL_STYLE_ID_DARK : MAPGL_STYLE_ID);

/**
 * Создаёт карту 2GIS в контейнере. Опции применяются только при создании.
 * При смене темы карта пересоздаётся с другим стилем, положение камеры сохраняется.
 * Возвращает инстанс (после загрузки SDK) и текст ошибки, если карта недоступна.
 */
export function useMapgl(containerRef: RefObject<HTMLDivElement | null>, options: InitOptions) {
  const { theme } = useTheme();
  const style = styleFor(theme);
  const camera = useRef<Partial<InitOptions>>(options);
  const [instance, setInstance] = useState<MapglInstance | null>(null);
  const [error, setError] = useState<string | null>(MAPGL_KEY ? null : 'не задан ключ 2GIS (VITE_2GIS_KEY)');

  useEffect(() => {
    if (!MAPGL_KEY) return;
    let cancelled = false;
    let map: MapglMap | null = null;

    loadMapgl()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        map = new api.Map(containerRef.current, {
          lang: 'ru',
          enableTrackResize: true,
          defaultBackgroundColor: MAP_BG[theme],
          ...(style ? { style } : {}),
          ...camera.current,
          key: MAPGL_KEY,
        });
        setInstance({ api, map });
      })
      .catch(() => !cancelled && setError('не удалось загрузить 2GIS'));

    return () => {
      cancelled = true;
      if (map) {
        camera.current = {
          ...camera.current,
          center: map.getCenter(),
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          rotation: map.getRotation(),
        };
        map.destroy();
      }
      setInstance(null);
    };
    // theme нужен только ради цвета подложки, пересоздаём карту по смене стиля
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, style]);

  return { instance, error };
}

/** Перевод из привычного [lat, lng] в формат 2GIS. */
export const toLngLat = (lat: number, lng: number): LngLat => [lng, lat];
