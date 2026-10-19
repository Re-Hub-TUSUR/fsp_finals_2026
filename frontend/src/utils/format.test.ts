import { describe, expect, it } from 'vitest';
import {
  formatAges,
  formatPrice,
  formatTimeBadge,
  isForeignZone,
  registrationClosesAt,
  spotsLeft,
  toLocalInput,
  utcLabel,
  zonedLocalToIso,
} from './format';

describe('formatPrice', () => {
  it('shows "Бесплатно" for no price', () => {
    expect(formatPrice(undefined)).toBe('Бесплатно');
    expect(formatPrice(0)).toBe('Бесплатно');
  });

  it('formats a positive price with the ruble sign', () => {
    expect(formatPrice(500)).toBe('500 ₽');
    expect(formatPrice(1500)).toBe('1 500 ₽');
  });
});

describe('formatAges', () => {
  it('returns null when neither bound is set', () => {
    expect(formatAges(undefined, undefined)).toBeNull();
  });

  it('formats a range when both bounds are set', () => {
    expect(formatAges(12, 18)).toBe('12–18 лет');
  });

  it('formats an open-ended lower bound', () => {
    expect(formatAges(16, undefined)).toBe('от 16 лет');
  });

  it('formats an open-ended upper bound', () => {
    expect(formatAges(undefined, 10)).toBe('до 10 лет');
  });
});

describe('spotsLeft', () => {
  it('computes remaining capacity', () => {
    expect(spotsLeft({ capacity: 10, confirmedCount: 4 })).toBe(6);
  });

  it('never goes negative when overbooked', () => {
    expect(spotsLeft({ capacity: 5, confirmedCount: 7 })).toBe(0);
  });
});

describe('toLocalInput', () => {
  it('pads single-digit month/day/hour/minute for <input type="datetime-local">', () => {
    const d = new Date(2026, 0, 2, 3, 4, 0);
    expect(toLocalInput(d)).toBe('2026-01-02T03:04');
  });
});

describe('registrationClosesAt', () => {
  it('uses the explicit deadline when set', () => {
    const result = registrationClosesAt({ registrationDeadline: '2026-01-01T00:00:00Z', startTime: '2026-02-01T00:00:00Z' });
    expect(result.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('falls back to the event start time when no deadline is set', () => {
    const result = registrationClosesAt({ startTime: '2026-02-01T00:00:00Z' });
    expect(result.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('utcLabel / isForeignZone', () => {
  it('formats a positive UTC offset without zero minutes', () => {
    // Asia/Krasnoyarsk is UTC+7 year-round (no DST)
    expect(utcLabel('Asia/Krasnoyarsk', new Date('2026-06-15T00:00:00Z'))).toBe('UTC+7');
  });

  it('includes minutes when the offset is not a whole hour', () => {
    // Asia/Calcutta is UTC+5:30
    expect(utcLabel('Asia/Calcutta', new Date('2026-06-15T00:00:00Z'))).toBe('UTC+5:30');
  });

  it('treats the same offset as not foreign, regardless of zone name', () => {
    expect(isForeignZone('Asia/Krasnoyarsk')).toBe(isForeignZone('Asia/Krasnoyarsk'));
  });

  it('returns false for an undefined zone', () => {
    expect(isForeignZone(undefined)).toBe(false);
  });
});

describe('zonedLocalToIso', () => {
  it('returns undefined for an empty value', () => {
    expect(zonedLocalToIso('')).toBeUndefined();
  });

  it('interprets the wall-clock value as local time in the given zone', () => {
    // 19:00 in Krasnoyarsk (UTC+7) is 12:00 UTC
    const iso = zonedLocalToIso('2026-10-20T19:00', 'Asia/Krasnoyarsk');
    expect(iso).toBe('2026-10-20T12:00:00.000Z');
  });

  it('falls back to device-local interpretation without a zone', () => {
    const value = '2026-10-20T19:00';
    expect(zonedLocalToIso(value)).toBe(new Date(value).toISOString());
  });
});

describe('formatTimeBadge', () => {
  it('shows "Идёт сейчас" while in progress', () => {
    const now = Date.now();
    const start = new Date(now - 1000).toISOString();
    const end = new Date(now + 3600_000).toISOString();
    expect(formatTimeBadge(start, end)).toBe('Идёт сейчас');
  });

  it('shows "Завершено" once the event has ended', () => {
    const now = Date.now();
    const start = new Date(now - 7200_000).toISOString();
    const end = new Date(now - 3600_000).toISOString();
    expect(formatTimeBadge(start, end)).toBe('Завершено');
  });

  it('counts down in minutes under an hour away', () => {
    const start = new Date(Date.now() + 30 * 60_000).toISOString();
    expect(formatTimeBadge(start)).toBe('через 30 мин');
  });

  it('counts down in hours under a day away', () => {
    const start = new Date(Date.now() + 5 * 3600_000).toISOString();
    expect(formatTimeBadge(start)).toBe('через 5 ч');
  });

  it('says "завтра" for 24-48h out', () => {
    const start = new Date(Date.now() + 30 * 3600_000).toISOString();
    expect(formatTimeBadge(start)).toBe('завтра');
  });
});
