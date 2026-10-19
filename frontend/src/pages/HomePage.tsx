import React, { useEffect, useMemo, useState } from 'react';
import type { JoinMode, SkillLevel, Sport, SportEvent } from '../types';
import { BlinkMap } from '../components/BlinkMap';
import type { MapViewport } from '../components/BlinkMap';
import { EventCard } from '../components/EventCard';
import { LocateFixed, Loader2, List, Map as MapIcon, Search, SearchX } from 'lucide-react';
import { catalogApi, eventsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { JOIN_MODE_LABELS, SKILL_LABELS } from '../utils/format';

const selectClass =
  'px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-emerald-500';

/** Пока город пользователя неизвестен — центр Красноярска. */
const DEFAULT_CENTER: [number, number] = [56.0153, 92.8932];

export const HomePage: React.FC = () => {
  const { currentUser, ready, preferences } = useAuth();
  const homeCenter = useMemo<[number, number]>(() => {
    if (preferences?.homeLat != null && preferences.homeLng != null) return [preferences.homeLat, preferences.homeLng];
    if (preferences?.homeCity) return [preferences.homeCity.lat, preferences.homeCity.lng];
    return DEFAULT_CENTER;
  }, [preferences]);
  const [geoCenter, setGeoCenter] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const center = geoCenter ?? homeCenter;
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [skill, setSkill] = useState<SkillLevel | ''>('');
  const [joinMode, setJoinMode] = useState<JoinMode | ''>('');
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    catalogApi.sports().then(setSports).catch(() => setSports([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!ready || !viewport) return;
    let cancelled = false;
    setLoading(true);
    eventsApi
      .list({
        // Каталог всегда ограничен видимой областью карты — в масштабе страны иначе не обойтись
        lat: viewport.lat,
        lng: viewport.lng,
        radiusKm: viewport.radiusKm,
        sport: selectedSports,
        q: debouncedQuery || undefined,
        skillLevel: skill || undefined,
        joinMode: joinMode || undefined,
      })
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
        setError(null);
        setSelectedEvent((prev) => (prev ? (list.find((e) => e.id === prev.id) ?? null) : null));
      })
      .catch((e) => !cancelled && setError(errorMessage(e, 'Не удалось загрузить мероприятия')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // currentUser?.id — чтобы после смены роли обновились статусы «Вы участвуете»
  }, [ready, viewport, currentUser?.id, selectedSports, debouncedQuery, skill, joinMode]);

  const locateMe = () => {
    setGeoError(null);
    if (!navigator.geolocation) return setGeoError('Геолокация недоступна в этом браузере');
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeoCenter([pos.coords.latitude, pos.coords.longitude]),
      () => setGeoError('Не удалось определить местоположение — разрешите доступ к геолокации'),
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  const toggleSport = (slug: string) =>
    setSelectedSports((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const pill = (active: boolean) =>
    `px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
      active
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="search"
            aria-label="Поиск мероприятий"
            placeholder="Поиск по названию, адресу, описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-base outline-none bg-transparent text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label="Уровень подготовки"
            value={skill}
            onChange={(e) => setSkill(e.target.value as SkillLevel | '')}
            className={selectClass}
          >
            <option value="">Любой уровень</option>
            {(['NOVICE', 'AMATEUR', 'PRO'] as SkillLevel[]).map((s) => (
              <option key={s} value={s}>
                {SKILL_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Режим записи"
            value={joinMode}
            onChange={(e) => setJoinMode(e.target.value as JoinMode | '')}
            className={selectClass}
          >
            <option value="">Любая запись</option>
            {(['OPEN', 'APPROVAL'] as JoinMode[]).map((m) => (
              <option key={m} value={m}>
                {JOIN_MODE_LABELS[m]}
              </option>
            ))}
          </select>

          <button
            onClick={locateMe}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50"
          >
            <LocateFixed className="w-4 h-4" /> Рядом со мной
          </button>

          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('map')}
              aria-pressed={viewMode === 'map'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Карта</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Список ({events.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3">
        <button onClick={() => setSelectedSports([])} className={pill(selectedSports.length === 0)}>
          Все виды
        </button>
        {sports.map((s) => (
          <button key={s.slug} onClick={() => toggleSport(s.slug)} className={pill(selectedSports.includes(s.slug))}>
            {s.name}
          </button>
        ))}
      </div>

      {geoError && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">{geoError}</div>}
      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      {viewMode === 'map' ? (
        <div className="relative h-[calc(100vh-290px)] min-h-[480px]">
          <BlinkMap
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            center={center}
            onViewportChange={setViewport}
          />
          {loading && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 shadow rounded-full px-3 py-1.5 text-sm text-slate-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Загружаем…
            </div>
          )}
        </div>
      ) : loading && events.length === 0 ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <SearchX className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          Ничего не найдено. Попробуйте изменить фильтры.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};
