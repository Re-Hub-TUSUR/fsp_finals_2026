/** Прогноз погоды для мероприятия: Open-Meteo (без ключа, CORS открыт). */

const API = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 16;
const DAY_MS = 24 * 3600 * 1000;
const HOUR_MS = 3600 * 1000;

export interface Hourly {
  time: string[];
  temperature_2m: (number | null)[];
  precipitation_probability: (number | null)[];
  wind_speed_10m: (number | null)[];
  weather_code: (number | null)[];
}

export interface WeatherSummary {
  tempMin: number;
  tempMax: number;
  precipMax: number;
  windMax: number;
  code: number;
}

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

/** Прогноз есть только на ближайшие ~15 дней и только для ещё не закончившегося мероприятия. */
export function weatherVisible(startTime: string, endTime: string, now = new Date()): boolean {
  return new Date(endTime) > now && new Date(startTime).getTime() - now.getTime() <= (FORECAST_DAYS - 1) * DAY_MS;
}

/** Часы, пересекающие интервал мероприятия (минимум — час начала); null — данных нет. */
export function summarize(hourly: Hourly, start: Date, end: Date): WeatherSummary | null {
  const from = Math.floor(start.getTime() / HOUR_MS) * HOUR_MS;
  const temps: number[] = [];
  const precip: number[] = [];
  const wind: number[] = [];
  const codes: number[] = [];
  hourly.time.forEach((t, i) => {
    const at = new Date(`${t}Z`).getTime(); // время запрашивается в UTC, Open-Meteo отдаёт его без зоны
    if (at < from || (at >= end.getTime() && at !== from)) return;
    const temp = hourly.temperature_2m[i];
    if (temp == null) return;
    temps.push(temp);
    precip.push(hourly.precipitation_probability[i] ?? 0);
    wind.push(hourly.wind_speed_10m[i] ?? 0);
    codes.push(hourly.weather_code[i] ?? 0);
  });
  if (temps.length === 0) return null;
  return {
    tempMin: Math.min(...temps),
    tempMax: Math.max(...temps),
    precipMax: Math.max(...precip),
    windMax: Math.max(...wind),
    code: Math.max(...codes), // худшее за время мероприятия
  };
}

/** Код WMO → подпись и вид значка. */
export function weatherInfo(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: 'Ясно', kind: 'clear' };
  if (code <= 2) return { label: 'Переменная облачность', kind: 'partly' };
  if (code === 3) return { label: 'Пасмурно', kind: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Туман', kind: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Морось', kind: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Дождь', kind: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Снег', kind: 'snow' };
  if (code >= 95) return { label: 'Гроза', kind: 'storm' };
  return { label: 'Облачно', kind: 'cloudy' };
}

export function formatTemp(s: WeatherSummary): string {
  const lo = Math.round(s.tempMin);
  const hi = Math.round(s.tempMax);
  return lo === hi ? `${lo} °C` : `${lo}…${hi} °C`;
}

// Прогноз точки не меняется за минуты — запоминаем по координатам с округлением ~10 км
const cache = new Map<string, Promise<Hourly>>();

export function fetchWeather(lat: number, lng: number, start: Date, end: Date): Promise<WeatherSummary | null> {
  const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
  let hourly = cache.get(key);
  if (!hourly) {
    const url =
      `${API}?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}` +
      '&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code' +
      `&wind_speed_unit=ms&timezone=UTC&forecast_days=${FORECAST_DAYS}`;
    hourly = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`weather ${r.status}`);
        return r.json() as Promise<{ hourly: Hourly }>;
      })
      .then((j) => j.hourly);
    hourly.catch(() => cache.delete(key));
    cache.set(key, hourly);
  }
  return hourly.then((h) => summarize(h, start, end));
}
