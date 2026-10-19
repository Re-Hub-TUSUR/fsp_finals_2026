import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { JoinMode, SkillLevel, Sport, SportEvent } from '../types';
import { BlinkMap } from '../components/BlinkMap';
import { EventMeter, OrgAvatar } from '../components/EventBits';
import { Modal } from '../components/Modal';
import { Chip, SectionLabel, Segmented, Toggle } from '../components/ui';
import { ArrowDownWideNarrow, Loader2, Search, SearchX } from 'lucide-react';
import { catalogApi, eventsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SKILL_LABELS, spotsLeft } from '../utils/format';
import {
  WHEN_LABELS,
  distanceKm,
  formatDistance,
  matchesWhen,
  startLabel,
  type LatLng,
  type WhenFilter,
} from '../utils/eventView';

type DistFilter = 'all' | '1' | '3' | '5' | '10';
type SortMode = 'near' | 'time';

const FilterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);

const pluralEvents = (n: number) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'событие';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'события';
  return 'событий';
};

export const HomePage: React.FC = () => {
  const { currentUser, ready } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 'list' : 'map';

  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [skill, setSkill] = useState<SkillLevel | ''>('');
  const [joinMode, setJoinMode] = useState<JoinMode | ''>('');
  const [when, setWhen] = useState<WhenFilter>('all');
  const [dist, setDist] = useState<DistFilter>('all');
  const [onlyFree, setOnlyFree] = useState(false);
  const [sort, setSort] = useState<SortMode>('near');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [events, setEvents] = useState<SportEvent[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    catalogApi.sports().then(setSports).catch(() => setSports([]));
  }, []);

  // Если геолокация уже разрешена — сразу показываем расстояния, без лишнего запроса разрешения
  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') {
          navigator.geolocation.getCurrentPosition((pos) =>
            setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    eventsApi
      .list({
        sport: selectedSports,
        q: debouncedQuery || undefined,
        skillLevel: skill || undefined,
        joinMode: joinMode || undefined,
      })
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
        setError(null);
      })
      .catch((e) => !cancelled && setError(errorMessage(e, 'Не удалось загрузить мероприятия')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // currentUser?.id — чтобы после смены роли обновились статусы «Вы участвуете»
  }, [ready, currentUser?.id, selectedSports, debouncedQuery, skill, joinMode]);

  // Фильтры «когда», «расстояние», «свободные места» и сортировка — на клиенте
  const visible = useMemo(() => {
    const withDist = events.map((e) => ({ e, km: me ? distanceKm(me, e) : null }));
    return withDist
      .filter(({ e }) => matchesWhen(e, when))
      .filter(({ km }) => dist === 'all' || km == null || km <= Number(dist))
      .filter(({ e }) => !onlyFree || spotsLeft(e) > 0)
      .sort((a, b) =>
        sort === 'near' && a.km != null && b.km != null
          ? a.km - b.km
          : new Date(a.e.startTime).getTime() - new Date(b.e.startTime).getTime(),
      );
  }, [events, me, when, dist, onlyFree, sort]);

  const visibleEvents = useMemo(() => visible.map((v) => v.e), [visible]);
  const selectedEvent = visibleEvents.find((e) => e.id === selectedId) ?? null;

  const filterCount =
    (skill ? 1 : 0) + (joinMode ? 1 : 0) + (when !== 'all' ? 1 : 0) + (dist !== 'all' ? 1 : 0) + (onlyFree ? 1 : 0);

  const setView = (next: 'map' | 'list') => {
    const p = new URLSearchParams(params);
    if (next === 'list') p.set('view', 'list');
    else p.delete('view');
    setParams(p, { replace: true });
  };

  const toggleSport = (slug: string) =>
    setSelectedSports((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const resetFilters = () => {
    setSelectedSports([]);
    setSkill('');
    setJoinMode('');
    setWhen('all');
    setDist('all');
    setOnlyFree(false);
  };

  const pick = (event: SportEvent) => {
    setSelectedId(event.id);
    // На мобильном выбор в списке ведёт на карту с открытой карточкой
    if (view === 'list' && !window.matchMedia('(min-width: 1024px)').matches) setView('map');
  };

  const sportChips = (size: 'sm' | 'md', floating = false) => (
    <>
      <Chip size={size} floating={floating} active={selectedSports.length === 0} onClick={() => setSelectedSports([])}>
        Все
      </Chip>
      {sports.map((s) => (
        <Chip
          key={s.slug}
          size={size}
          floating={floating}
          active={selectedSports.includes(s.slug)}
          onClick={() => toggleSport(s.slug)}
        >
          {s.name}
        </Chip>
      ))}
    </>
  );

  const searchRow = (floating: boolean) => (
    <div className="flex gap-2">
      <label
        className={`flex-1 h-12 flex items-center gap-2.5 px-3.5 rounded-2xl text-muted focus-within:ring-2 focus-within:ring-brand/40 transition-shadow ${
          floating ? 'bg-white border border-line shadow-card' : 'bg-surface'
        }`}
      >
        <Search className="w-5 h-5 shrink-0" />
        <input
          type="search"
          aria-label="Поиск мероприятий"
          placeholder="Спорт, место или клуб"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent outline-none text-[15px] font-medium text-ink placeholder:text-muted"
        />
      </label>
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        aria-label="Фильтры"
        className={`relative w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl bg-white border border-line text-ink hover:bg-surface transition-colors ${
          floating ? 'shadow-card' : ''
        }`}
      >
        <FilterIcon />
        {filterCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand text-on-brand border-2 border-white text-[11px] font-bold leading-4 text-center">
            {filterCount}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <div className="relative h-full lg:grid lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
      {/* Список */}
      <aside
        className={`${view === 'list' ? 'flex' : 'hidden'} lg:flex flex-col h-full min-h-0 bg-white lg:border-r border-line`}
      >
        <div className="px-4 sm:px-5 pt-5 pb-3 flex flex-col gap-3.5">
          {searchRow(false)}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar lg:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0">
            {sportChips('sm')}
          </div>
          <div className="flex items-end justify-between gap-3 pt-2">
            <div>
              <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] text-ink">Рядом с вами</h1>
              <p className="text-[13px] font-medium text-muted">
                {visible.length} {pluralEvents(visible.length)} · Красноярск
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSort((s) => (s === 'near' ? 'time' : 'near'))}
              className="flex items-center gap-1.5 h-9 px-2 -mr-2 rounded-lg text-sm font-medium text-muted hover:text-ink"
              title={me ? undefined : 'Расстояние появится, когда известна ваша геопозиция'}
            >
              {sort === 'near' && me ? 'Ближе' : 'По времени'}
              <ArrowDownWideNarrow className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mx-4 sm:mx-5 mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6 flex flex-col gap-2">
          {loading && events.length === 0 ? (
            <div className="flex justify-center py-16 text-muted">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 px-6 text-muted text-sm">
              <SearchX className="w-10 h-10 mx-auto mb-2 opacity-50" />
              Ничего не найдено. Попробуйте изменить фильтры.
            </div>
          ) : (
            visible.map(({ e, km }) => {
              const active = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => pick(e)}
                  aria-pressed={active}
                  className={`w-full text-left flex gap-3 p-3 rounded-[18px] border-[1.5px] transition-colors ${
                    active ? 'bg-brand-tint border-brand' : 'bg-white border-line hover:border-surface-2 hover:bg-surface/60'
                  }`}
                >
                  <OrgAvatar event={e} size={44} active={active} />
                  <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                    <div className="flex justify-between gap-2 text-xs font-semibold text-muted">
                      <span className="truncate">
                        {startLabel(e)} · {e.sport.name}
                      </span>
                      {km != null && <span className="shrink-0">{formatDistance(km)}</span>}
                    </div>
                    <div className="text-base font-semibold leading-tight text-ink">{e.title}</div>
                    <div className="mt-1">
                      <EventMeter event={e} compact />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Карта */}
      <section className={`${view === 'map' ? 'block' : 'hidden'} lg:block relative h-full min-h-0`}>
        <BlinkMap
          events={visibleEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={(e) => setSelectedId(e?.id ?? null)}
          me={me}
          onLocate={setMe}
          controlsClassName="top-[118px] right-3 lg:top-4 lg:right-4"
          cardClassName="bottom-3 lg:bottom-4"
        />

        {/* Поиск и чипы поверх карты — только на мобильном */}
        <div className="lg:hidden pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/85 to-transparent z-10" />
        <div className="lg:hidden absolute top-3 inset-x-3 z-20">{searchRow(true)}</div>
        <div className="lg:hidden absolute top-[68px] inset-x-0 z-20 flex gap-2 px-3 overflow-x-auto no-scrollbar">
          {sportChips('md', true)}
        </div>

        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden lg:flex bg-white shadow-card border border-line rounded-full px-3 py-1.5 text-sm text-muted items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Загружаем…
          </div>
        )}
      </section>

      {filtersOpen && (
        <Modal
          title="Фильтры"
          onClose={() => setFiltersOpen(false)}
          headerAction={
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 px-3 rounded-xl text-[15px] font-semibold text-brand-ink hover:bg-surface"
            >
              Сбросить
            </button>
          }
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <SectionLabel>Вид спорта</SectionLabel>
              <div className="flex flex-wrap gap-2">{sportChips('md')}</div>
            </div>
            <div className="flex flex-col gap-2.5">
              <SectionLabel>Когда</SectionLabel>
              <Segmented
                label="Когда"
                value={when}
                onChange={setWhen}
                options={(Object.keys(WHEN_LABELS) as WhenFilter[]).map((v) => ({ value: v, label: WHEN_LABELS[v] }))}
              />
            </div>
            {me && (
              <div className="flex flex-col gap-2.5">
                <SectionLabel>Расстояние</SectionLabel>
                <Segmented
                  label="Расстояние"
                  value={dist}
                  onChange={setDist}
                  options={[
                    { value: 'all', label: 'Любое' },
                    { value: '1', label: '1 км' },
                    { value: '3', label: '3 км' },
                    { value: '5', label: '5 км' },
                    { value: '10', label: '10 км' },
                  ]}
                />
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              <SectionLabel>Уровень</SectionLabel>
              <Segmented
                label="Уровень"
                value={skill || 'all'}
                onChange={(v) => setSkill(v === 'all' ? '' : (v as SkillLevel))}
                options={[
                  { value: 'all', label: 'Любой' },
                  ...(['NOVICE', 'AMATEUR', 'PRO'] as SkillLevel[]).map((s) => ({ value: s, label: SKILL_LABELS[s] })),
                ]}
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <SectionLabel>Запись</SectionLabel>
              <Segmented
                label="Запись"
                value={joinMode || 'all'}
                onChange={(v) => setJoinMode(v === 'all' ? '' : (v as JoinMode))}
                options={[
                  { value: 'all', label: 'Любая' },
                  { value: 'OPEN', label: 'Свободная' },
                  { value: 'APPROVAL', label: 'По заявке' },
                ]}
              />
            </div>
            <Toggle checked={onlyFree} onChange={setOnlyFree}>
              Только со свободными местами
            </Toggle>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="h-14 rounded-[18px] bg-brand text-on-brand text-[17px] font-bold hover:bg-brand-hover transition-colors"
            >
              Показать {visible.length} {pluralEvents(visible.length)}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
