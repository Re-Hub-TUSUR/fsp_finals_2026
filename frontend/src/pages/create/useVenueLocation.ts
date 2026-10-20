import { useEffect, useState } from 'react';
import { citiesApi } from '../../api';
import type { City } from '../../types';
import { geocodeAddress } from '../../lib/mapgl';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { DEFAULT_CITY_CENTER } from '../../constants';

export type AddressSearch = 'idle' | 'loading' | 'found' | 'missing';

const MIN_ADDRESS_LENGTH = 4;

/**
 * Точка сбора мероприятия: ставится кликом по карте или находится по введённому адресу.
 * Пока автор её не трогал, стоит в его домашнем городе. Ближайший к точке город задаёт
 * часовой пояс, в котором автор вводит время начала и окончания.
 */
export function useVenueLocation(address: string, homeCity: City | null | undefined) {
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [found, setFound] = useState<{ query: string; coords: [number, number] | null } | null>(null);
  const [venueCity, setVenueCity] = useState<City | null>(null);

  const fallback: [number, number] = homeCity ? [homeCity.lat, homeCity.lng] : [DEFAULT_CITY_CENTER.lat, DEFAULT_CITY_CENTER.lng];
  const coords = picked ?? fallback;

  // Адрес ищем после паузы в наборе: каждое нажатие клавиши не должно ходить в геокодер
  const query = useDebouncedValue(address.trim(), 700);
  const homeLat = homeCity?.lat;
  const homeLng = homeCity?.lng;
  useEffect(() => {
    if (query.length < MIN_ADDRESS_LENGTH) return;
    let cancelled = false;
    geocodeAddress(query, homeLat != null && homeLng != null ? { lat: homeLat, lng: homeLng } : undefined)
      .catch(() => null)
      .then((result) => {
        if (cancelled) return;
        const point: [number, number] | null = result ? [result.lat, result.lng] : null;
        setFound({ query, coords: point });
        if (point) setPicked(point);
      });
    return () => {
      cancelled = true;
    };
  }, [query, homeLat, homeLng]);

  // Ключ-строка, а не массив: новый массив на каждом рендере перезапускал бы таймер бесконечно
  const settledKey = useDebouncedValue(`${coords[0]},${coords[1]}`, 300);
  const [lat, lng] = settledKey.split(',').map(Number);
  useEffect(() => {
    let cancelled = false;
    citiesApi
      .nearest(lat, lng)
      .then((city) => !cancelled && setVenueCity(city))
      .catch(() => !cancelled && setVenueCity(null));
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const typed = address.trim();
  const addressSearch: AddressSearch =
    typed.length < MIN_ADDRESS_LENGTH
      ? 'idle'
      : found?.query !== typed
        ? 'loading'
        : found.coords
          ? 'found'
          : 'missing';

  return {
    coords,
    venueCity,
    addressSearch,
    pick: (lat: number, lng: number) => setPicked([lat, lng]),
  };
}
