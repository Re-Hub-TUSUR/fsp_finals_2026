import { beforeEach, describe, expect, it } from 'vitest';
import type { SportEvent } from '../types';
import {
  SNAPSHOT_MAX_AGE_MS,
  SNAPSHOT_MAX_EVENTS,
  readEventsSnapshot,
  snapshotKey,
  writeEventsSnapshot,
} from './eventsSnapshot';

const ev = (id: number) => ({ id, title: `Событие ${id}` }) as unknown as SportEvent;
const query = { userId: 1, lat: 55.7512, lng: 37.6184, radiusKm: 9.2, sports: ['tennis', 'chess'] };

describe('eventsSnapshot', () => {
  beforeEach(() => localStorage.clear());

  it('key ignores small map shifts and sport order but not user or area', () => {
    const base = snapshotKey(query);
    expect(snapshotKey({ ...query, lat: 55.7549, lng: 37.6221, radiusKm: 9.9, sports: ['chess', 'tennis'] })).toBe(base);
    expect(snapshotKey({ ...query, userId: 2 })).not.toBe(base);
    expect(snapshotKey({ ...query, userId: null })).not.toBe(base);
    expect(snapshotKey({ ...query, lat: 59.93, lng: 30.33 })).not.toBe(base);
  });

  it('returns what was written for the same key', () => {
    const key = snapshotKey(query);
    writeEventsSnapshot(key, [ev(1), ev(2)], 1000);
    expect(readEventsSnapshot(key, 2000)?.map((e) => e.id)).toEqual([1, 2]);
  });

  it('does not return a snapshot for another key', () => {
    writeEventsSnapshot(snapshotKey(query), [ev(1)], 1000);
    expect(readEventsSnapshot(snapshotKey({ ...query, userId: 2 }), 1500)).toBeNull();
  });

  it('expires after max age', () => {
    const key = snapshotKey(query);
    writeEventsSnapshot(key, [ev(1)], 1000);
    expect(readEventsSnapshot(key, 1000 + SNAPSHOT_MAX_AGE_MS)).not.toBeNull();
    expect(readEventsSnapshot(key, 1001 + SNAPSHOT_MAX_AGE_MS)).toBeNull();
  });

  it('caps the stored list', () => {
    const key = snapshotKey(query);
    writeEventsSnapshot(key, Array.from({ length: SNAPSHOT_MAX_EVENTS + 50 }, (_, i) => ev(i)), 1000);
    expect(readEventsSnapshot(key, 1000)).toHaveLength(SNAPSHOT_MAX_EVENTS);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('sp:events-snapshot:v1', '{broken');
    expect(readEventsSnapshot(snapshotKey(query))).toBeNull();
    localStorage.setItem('sp:events-snapshot:v1', JSON.stringify({ key: snapshotKey(query), savedAt: Date.now(), events: 5 }));
    expect(readEventsSnapshot(snapshotKey(query))).toBeNull();
  });
});
