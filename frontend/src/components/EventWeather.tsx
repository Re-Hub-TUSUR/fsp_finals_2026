import { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from 'lucide-react';
import type { SportEvent } from '../types';
import {
  fetchWeather,
  formatTemp,
  weatherInfo,
  weatherVisible,
  type WeatherKind,
  type WeatherSummary,
} from '../utils/weather';

const WEATHER_ICONS: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export interface EventWeatherView {
  Icon: LucideIcon;
  /** «Пасмурно, 12…14 °C» */
  title: string;
  /** «осадки 60% · ветер 5 м/с» */
  details: string;
}

export const weatherView = (w: WeatherSummary): EventWeatherView => {
  const info = weatherInfo(w.code);
  return {
    Icon: WEATHER_ICONS[info.kind],
    title: `${info.label}, ${formatTemp(w)}`,
    details: `осадки ${Math.round(w.precipMax)}% · ветер ${Math.round(w.windMax)} м/с`,
  };
};

/** Прогноз на время мероприятия; null, если его нет (далеко, прошло, сбой) — тогда ничего не показываем. */
export function useEventWeather(event: Pick<SportEvent, 'lat' | 'lng' | 'startTime' | 'endTime'>): EventWeatherView | null {
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const visible = weatherVisible(event.startTime, event.endTime);
  useEffect(() => {
    setWeather(null);
    if (!visible) return;
    let cancelled = false;
    fetchWeather(event.lat, event.lng, new Date(event.startTime), new Date(event.endTime))
      .then((w) => !cancelled && setWeather(w))
      .catch(() => !cancelled && setWeather(null));
    return () => {
      cancelled = true;
    };
  }, [visible, event.lat, event.lng, event.startTime, event.endTime]);
  return visible && weather ? weatherView(weather) : null;
}
