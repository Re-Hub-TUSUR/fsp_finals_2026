import { describe, expect, it } from 'vitest';
import { formatTemp, summarize, weatherInfo, weatherVisible, type Hourly } from './weather';

const hourly: Hourly = {
  time: ['2030-05-01T09:00', '2030-05-01T10:00', '2030-05-01T11:00', '2030-05-01T12:00'],
  temperature_2m: [10, 12, 14, 16],
  precipitation_probability: [0, 20, 60, 10],
  wind_speed_10m: [2, 3, 5, 4],
  weather_code: [0, 3, 61, 1],
};

describe('summarize', () => {
  it('takes hours that overlap the event and the worst conditions', () => {
    const s = summarize(hourly, new Date('2030-05-01T10:00:00Z'), new Date('2030-05-01T12:00:00Z'));
    expect(s).toEqual({ tempMin: 12, tempMax: 14, precipMax: 60, windMax: 5, code: 61 });
  });

  it('includes the starting hour for a start in the middle of an hour', () => {
    const s = summarize(hourly, new Date('2030-05-01T10:30:00Z'), new Date('2030-05-01T10:45:00Z'));
    expect(s?.tempMin).toBe(12);
    expect(s?.tempMax).toBe(12);
  });

  it('returns null when the forecast has no such hours', () => {
    expect(summarize(hourly, new Date('2030-06-01T10:00:00Z'), new Date('2030-06-01T12:00:00Z'))).toBeNull();
  });
});

describe('weatherInfo', () => {
  it('maps WMO codes', () => {
    expect(weatherInfo(0).kind).toBe('clear');
    expect(weatherInfo(2).kind).toBe('partly');
    expect(weatherInfo(3).kind).toBe('cloudy');
    expect(weatherInfo(45).kind).toBe('fog');
    expect(weatherInfo(53).kind).toBe('drizzle');
    expect(weatherInfo(63).kind).toBe('rain');
    expect(weatherInfo(81).kind).toBe('rain');
    expect(weatherInfo(73).kind).toBe('snow');
    expect(weatherInfo(95).kind).toBe('storm');
  });
});

describe('weatherVisible', () => {
  const now = new Date('2030-05-01T12:00:00Z');
  const at = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();

  it('hides finished events', () => {
    expect(weatherVisible(at(-1), at(-0.5), now)).toBe(false);
  });
  it('shows ongoing and near events', () => {
    expect(weatherVisible(at(-0.1), at(0.1), now)).toBe(true);
    expect(weatherVisible(at(15), at(15.1), now)).toBe(true);
  });
  it('hides events beyond the forecast range', () => {
    expect(weatherVisible(at(16), at(16.1), now)).toBe(false);
  });
});

describe('formatTemp', () => {
  it('shows a single value or a range', () => {
    expect(formatTemp({ tempMin: 12.2, tempMax: 12.4, precipMax: 0, windMax: 0, code: 0 })).toBe('12 °C');
    expect(formatTemp({ tempMin: 10, tempMax: 14.6, precipMax: 0, windMax: 0, code: 0 })).toBe('10…15 °C');
  });
});
