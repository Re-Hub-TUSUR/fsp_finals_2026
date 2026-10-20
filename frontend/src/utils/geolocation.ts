import type { LatLng } from './eventView';

export class GeolocationError extends Error {
  readonly reason: 'unsupported' | 'failed';

  constructor(reason: 'unsupported' | 'failed') {
    super(reason === 'unsupported' ? 'Браузер не поддерживает геолокацию' : 'Не удалось определить местоположение');
    this.reason = reason;
  }
}

/** Текущая позиция пользователя; отклоняется с GeolocationError, если API нет или доступ не дан. */
export function currentPosition(options: PositionOptions = { timeout: 10_000 }): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GeolocationError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new GeolocationError('failed')),
      options,
    );
  });
}

/** Позиция без запроса разрешения: только если доступ к геолокации уже выдан, иначе null. */
export async function positionIfGranted(): Promise<LatLng | null> {
  if (!navigator.geolocation || !navigator.permissions) return null;
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state === 'granted' ? await currentPosition() : null;
  } catch {
    return null;
  }
}
