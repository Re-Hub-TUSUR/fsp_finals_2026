import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentPosition, GeolocationError, positionIfGranted } from './geolocation';

const original = { geolocation: navigator.geolocation, permissions: navigator.permissions };

function stub(geolocation: unknown, permissions?: unknown) {
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true });
  Object.defineProperty(navigator, 'permissions', { value: permissions, configurable: true });
}

const okGeo = {
  getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 56, longitude: 92.9 } } as GeolocationPosition),
};

afterEach(() => stub(original.geolocation, original.permissions));

describe('currentPosition', () => {
  it('resolves with coordinates', async () => {
    stub(okGeo);
    await expect(currentPosition()).resolves.toEqual({ lat: 56, lng: 92.9 });
  });

  it('rejects when the browser has no geolocation', async () => {
    stub(undefined);
    await expect(currentPosition()).rejects.toBeInstanceOf(GeolocationError);
  });

  it('rejects when access is denied', async () => {
    stub({ getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) => fail({} as GeolocationPositionError) });
    await expect(currentPosition()).rejects.toMatchObject({ reason: 'failed' });
  });
});

describe('positionIfGranted', () => {
  it('asks for the position only when permission is already granted', async () => {
    const getCurrentPosition = vi.fn(okGeo.getCurrentPosition);
    stub({ getCurrentPosition }, { query: () => Promise.resolve({ state: 'prompt' }) });
    await expect(positionIfGranted()).resolves.toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();

    stub({ getCurrentPosition }, { query: () => Promise.resolve({ state: 'granted' }) });
    await expect(positionIfGranted()).resolves.toEqual({ lat: 56, lng: 92.9 });
  });
});
