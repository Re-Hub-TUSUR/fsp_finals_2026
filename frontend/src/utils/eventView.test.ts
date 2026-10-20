import { describe, expect, it } from 'vitest';
import type { SportEvent } from '../types';
import {
  capacityText,
  dayKey,
  dayKeyIn,
  startLabelLong,
  timeRange,
  distanceKm,
  eventAction,
  eventStatus,
  formatCardDate,
  formatDistance,
  freeSpotsText,
  initials,
  isFull,
  isHot,
  isLive,
  isMine,
  keyToDate,
  matchesWhen,
  plural,
  priceLabel,
  routeLinks,
  rowTime,
  sameWhen,
  seatText,
  splitAddress,
  whenLabel,
} from './eventView';

function baseEvent(overrides: Partial<SportEvent> = {}): SportEvent {
  return {
    id: 1,
    title: 'Событие',
    sport: { id: 1, name: 'Бег', slug: 'beg', custom: false },
    organizerName: 'Организатор',
    byOrganization: false,
    startTime: '2026-10-20T12:00:00Z',
    endTime: '2026-10-20T14:00:00Z',
    lat: 56,
    lng: 92,
    address: 'ул. Ленина, 1',
    capacity: 10,
    confirmedCount: 5,
    joinMode: 'OPEN',
    skillLevel: 'ANY',
    status: 'PUBLISHED',
    ...overrides,
  };
}

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Иван Петров')).toBe('ИП');
  });

  it('handles a single-word name', () => {
    expect(initials('Иван')).toBe('И');
  });

  it('falls back to a bullet for an empty name', () => {
    expect(initials('   ')).toBe('•');
  });
});

describe('plural', () => {
  it('picks the singular form for 1, 21, 31...', () => {
    expect(plural(1, 'место', 'места', 'мест')).toBe('место');
    expect(plural(21, 'место', 'места', 'мест')).toBe('место');
  });

  it('picks the "few" form for 2-4 (excluding the teens)', () => {
    expect(plural(2, 'место', 'места', 'мест')).toBe('места');
    expect(plural(3, 'место', 'места', 'мест')).toBe('места');
    expect(plural(24, 'место', 'места', 'мест')).toBe('места');
  });

  it('picks the "many" form for 5-20 and 11-14 even after a ten', () => {
    expect(plural(5, 'место', 'места', 'мест')).toBe('мест');
    expect(plural(11, 'место', 'места', 'мест')).toBe('мест');
    expect(plural(12, 'место', 'места', 'мест')).toBe('мест');
    expect(plural(14, 'место', 'места', 'мест')).toBe('мест');
    expect(plural(111, 'место', 'места', 'мест')).toBe('мест');
  });
});

describe('isLive / isHot / isFull / isMine', () => {
  it('isLive is true strictly between start and end', () => {
    const event = baseEvent({ startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-01T02:00:00Z' });
    const now = new Date('2026-01-01T01:00:00Z').getTime();
    expect(isLive(event, now)).toBe(true);
    expect(isLive(event, new Date('2026-01-01T02:00:00Z').getTime())).toBe(false);
  });

  it('isHot flags events with 1-2 spots left, not 0 and not 3+', () => {
    expect(isHot({ capacity: 10, confirmedCount: 8 })).toBe(true);
    expect(isHot({ capacity: 10, confirmedCount: 9 })).toBe(true);
    expect(isHot({ capacity: 10, confirmedCount: 10 })).toBe(false);
    expect(isHot({ capacity: 10, confirmedCount: 7 })).toBe(false);
  });

  it('isFull is true only with zero spots left', () => {
    expect(isFull({ capacity: 5, confirmedCount: 5 })).toBe(true);
    expect(isFull({ capacity: 5, confirmedCount: 4 })).toBe(false);
  });

  it('isMine is true for CONFIRMED or PENDING participation, not REJECTED/CANCELLED/absent', () => {
    expect(isMine(baseEvent({ myParticipation: { id: 1, status: 'CONFIRMED', createdAt: '' } }))).toBe(true);
    expect(isMine(baseEvent({ myParticipation: { id: 1, status: 'PENDING', createdAt: '' } }))).toBe(true);
    expect(isMine(baseEvent({ myParticipation: { id: 1, status: 'REJECTED', createdAt: '' } }))).toBe(false);
    expect(isMine(baseEvent({ myParticipation: { id: 1, status: 'CANCELLED', createdAt: '' } }))).toBe(false);
    expect(isMine(baseEvent())).toBe(false);
  });
});

describe('eventStatus', () => {
  it('reports "Мест нет" when full', () => {
    const status = eventStatus(baseEvent({ capacity: 5, confirmedCount: 5 }));
    expect(status.label).toBe('Мест нет');
    expect(status.special).toBe(true);
    expect(status.freeShort).toBe('Мест нет');
  });

  it('reports the remaining count when 1-2 spots are left', () => {
    const status = eventStatus(baseEvent({ capacity: 5, confirmedCount: 4 }));
    expect(status.label).toBe('Осталось 1');
    expect(status.special).toBe(true);
  });

  it('is not "special" for a comfortably open event', () => {
    // Дата в будущем: иначе в день фикстуры событие становится «идёт сейчас»
    const status = eventStatus(baseEvent({ startTime: '2099-06-01T10:00:00Z', endTime: '2099-06-01T12:00:00Z', capacity: 10, confirmedCount: 2 }));
    expect(status.special).toBe(false);
    expect(status.label).toBe('2 из 10');
  });

  it('computes the fill percentage', () => {
    expect(eventStatus(baseEvent({ capacity: 4, confirmedCount: 3 })).pct).toBe(75);
  });
});

describe('distanceKm / formatDistance', () => {
  it('returns ~0 for identical points', () => {
    expect(distanceKm({ lat: 56, lng: 92 }, { lat: 56, lng: 92 })).toBeCloseTo(0, 5);
  });

  it('computes a known great-circle distance (Krasnoyarsk ~ Moscow, roughly)', () => {
    // Krasnoyarsk (56.01, 92.85) to Moscow (55.75, 37.62): ~3350 km great-circle
    const km = distanceKm({ lat: 56.01, lng: 92.85 }, { lat: 55.75, lng: 37.62 });
    expect(km).toBeGreaterThan(3000);
    expect(km).toBeLessThan(3600);
  });

  it('formats sub-km distances in meters, rounded to 10m, min 10m', () => {
    expect(formatDistance(0.003)).toBe('10 м');
    expect(formatDistance(0.45)).toBe('450 м');
  });

  it('formats km distances with a comma decimal separator', () => {
    expect(formatDistance(3.26)).toBe('3,3 км');
  });
});

describe('splitAddress', () => {
  it('drops a leading city name matching cityName, then takes the next segment as main', () => {
    expect(splitAddress('Красноярск, ул. Ленина, 1', 'Красноярск')).toEqual({
      main: 'ул. Ленина',
      sub: '1',
    });
  });

  it('treats the first segment as the city (and drops it) when it looks like a bare city name, even without cityName', () => {
    expect(splitAddress('ул. Ленина, 1', 'Москва')).toEqual({ main: 'ул. Ленина', sub: '1' });
  });

  it('splits all remaining segments into sub after dropping the city', () => {
    expect(splitAddress('Красноярск, ул. Ленина, 1, офис 2', 'Красноярск')).toEqual({
      main: 'ул. Ленина',
      sub: '1, офис 2',
    });
  });

  it('does not drop a non-city first segment that contains non-letter characters', () => {
    expect(splitAddress('ул. Ленина, 1', undefined)).toEqual({ main: 'ул. Ленина', sub: '1' });
  });
});

describe('dayKey / keyToDate round-trip', () => {
  it('encodes and decodes a date losslessly (ignoring time-of-day)', () => {
    const d = new Date(2026, 9, 19); // October (0-indexed)
    const key = dayKey(d);
    expect(key).toBe(20261019);
    const back = keyToDate(key);
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(9);
    expect(back.getDate()).toBe(19);
  });
});

describe('matchesWhen', () => {
  const event = baseEvent({ startTime: '2026-10-20T10:00:00Z', endTime: '2026-10-20T12:00:00Z' });

  it('matches everything for kind "all"', () => {
    expect(matchesWhen(event, { kind: 'all' })).toBe(true);
  });

  it('matches a day range covering the event start', () => {
    expect(matchesWhen(event, { kind: 'range', from: dayKey(new Date('2026-10-20T00:00:00Z')), to: null })).toBe(true);
  });

  it('does not match a day range that excludes the event', () => {
    expect(matchesWhen(event, { kind: 'range', from: dayKey(new Date('2026-10-21T00:00:00Z')), to: null })).toBe(false);
  });
});

describe('sameWhen', () => {
  it('treats a single-day range with to=null the same as to=from', () => {
    expect(sameWhen({ kind: 'range', from: 1, to: null }, { kind: 'range', from: 1, to: 1 })).toBe(true);
  });

  it('distinguishes different kinds', () => {
    expect(sameWhen({ kind: 'all' }, { kind: 'now' })).toBe(false);
  });
});

describe('whenLabel', () => {
  it('labels "all" and "now"', () => {
    expect(whenLabel({ kind: 'all' })).toBe('Любое время');
    expect(whenLabel({ kind: 'now' })).toBe('Сейчас');
  });
});

describe('seatText', () => {
  it('shows free seats, a warning when few are left, and "Мест нет" when full', () => {
    expect(seatText(baseEvent({ capacity: 20, confirmedCount: 12 }))).toBe('Свободно 8 из 20');
    expect(seatText(baseEvent({ capacity: 10, confirmedCount: 9 }))).toBe('Осталось 1 из 10');
    expect(seatText(baseEvent({ capacity: 10, confirmedCount: 10 }))).toBe('Мест нет');
  });
});

describe('eventAction', () => {
  it('picks the label by join mode, fullness and own participation', () => {
    expect(eventAction(baseEvent()).label).toBe('Записаться');
    expect(eventAction(baseEvent({ joinMode: 'APPROVAL' })).label).toBe('Подать заявку');
    expect(eventAction(baseEvent({ confirmedCount: 10 }))).toMatchObject({ label: 'Встать в очередь', joinable: true });
    const mine = baseEvent({ myParticipation: { status: 'PENDING' } as SportEvent['myParticipation'] });
    expect(eventAction(mine)).toMatchObject({ label: 'Заявка отправлена', joinable: false });
  });
});

describe('eventAction: waitlist', () => {
  const queued = (confirmedCount: number) =>
    baseEvent({ capacity: 10, confirmedCount, myParticipation: { status: 'WAITLISTED' } as SportEvent['myParticipation'] });

  it('queued user of a full event just waits', () => {
    expect(eventAction(queued(10))).toMatchObject({ label: 'Вы в очереди', joinable: false });
  });

  it('queued user can claim a freed seat', () => {
    expect(eventAction(queued(9))).toMatchObject({ label: 'Занять место', joinable: true });
  });

  it('a queued user does not count as a participant', () => {
    expect(isMine(queued(9))).toBe(false);
  });
});

describe('priceLabel', () => {
  it('formats free and paid events', () => {
    expect(priceLabel({ price: 0 })).toBe('Бесплатно');
    expect(priceLabel({ price: 300 })).toBe('300 ₽');
  });
});

describe('rowTime', () => {
  const at = (ms: number) => new Date(Date.now() + ms).toISOString();
  it('shows "Сейчас" and the end time for a live event', () => {
    const t = rowTime({ startTime: at(-60_000), endTime: at(3_600_000) });
    expect(t.big).toBe('Сейчас');
    expect(t.small).toMatch(/^до \d{2}:\d{2}$/);
  });
  it('shows time and "завтра" for tomorrow', () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const t = rowTime({ startTime: d.toISOString(), endTime: new Date(d.getTime() + 3_600_000).toISOString() });
    expect(t).toEqual({ big: '10:00', small: 'завтра' });
  });
});

describe('routeLinks', () => {
  it('builds routes to the point with the coordinate order each service expects', () => {
    const byId = Object.fromEntries(routeLinks(56.01, 92.85).map((l) => [l.id, l.url]));
    expect(byId['2gis']).toBe('https://2gis.ru/directions/points/%7C92.85,56.01');
    expect(byId.yandex).toBe('https://yandex.ru/maps/?rtext=~56.01,92.85&rtt=auto');
    expect(byId.google).toBe('https://www.google.com/maps/dir/?api=1&destination=56.01,92.85');
  });
});

describe('formatCardDate', () => {
  it('formats dates matching the mockup style', () => {
    const d = new Date(2026, 9, 20, 7, 30); // 20 октября 2026, 07:30
    const str = formatCardDate(d);
    expect(str).toContain('20 октября');
    expect(str).toContain('07:30');
  });
});

describe('freeSpotsText', () => {
  it('formats Russian plurals for free spots correctly', () => {
    expect(freeSpotsText(0)).toBe('Мест нет');
    expect(freeSpotsText(1)).toBe('1 свободное место');
    expect(freeSpotsText(2)).toBe('2 свободных места');
    expect(freeSpotsText(4)).toBe('4 свободных места');
    expect(freeSpotsText(5)).toBe('5 свободных мест');
    expect(freeSpotsText(13)).toBe('13 свободных мест');
    expect(freeSpotsText(21)).toBe('21 свободное место');
    expect(freeSpotsText(22)).toBe('22 свободных места');
  });
});

describe('capacityText', () => {
  it('formats capacity text with proper plural forms', () => {
    expect(capacityText(0)).toBe('0 мест');
    expect(capacityText(1)).toBe('1 место');
    expect(capacityText(2)).toBe('2 места');
    expect(capacityText(5)).toBe('5 мест');
    expect(capacityText(10)).toBe('10 мест');
    expect(capacityText(17)).toBe('17 мест');
  });
});

describe('время в поясе места проведения', () => {
  const KRSK = 'Asia/Krasnoyarsk'; // UTC+7
  // Дата в будущем: в день фикстуры, пока событие идёт, ряд показывает «Сейчас» вместо времени
  const ev = { startTime: '2099-06-01T12:30:00Z', endTime: '2099-06-01T14:00:00Z', timeZone: KRSK };

  it('карточка, ряд и диапазон показывают одно и то же местное время', () => {
    expect(formatCardDate(ev.startTime, KRSK)).toContain('19:30');
    expect(rowTime(ev).big).toBe('19:30');
    expect(timeRange(ev)).toContain('19:30–21:00');
    expect(startLabelLong(ev)).toContain('19:30');
  });

  it('день события считается в его поясе (около полуночи)', () => {
    // 20:00 UTC = 03:00 следующего дня в Красноярске
    expect(dayKeyIn(new Date('2026-10-20T20:00:00Z'), KRSK)).toBe(20261021);
    expect(dayKeyIn(new Date('2026-10-20T20:00:00Z'), 'UTC')).toBe(20261020);
  });

  it('matchesWhen сопоставляет локальный день события', () => {
    const late = { startTime: '2026-10-20T20:00:00Z', endTime: '2026-10-20T21:00:00Z', timeZone: KRSK };
    expect(matchesWhen(late, { kind: 'range', from: 20261021, to: null })).toBe(true);
    expect(matchesWhen(late, { kind: 'range', from: 20261020, to: null })).toBe(false);
  });
});
