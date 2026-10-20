import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, List, Loader2, Maximize2, Search, SearchX, X } from 'lucide-react';
import type { City, Sport, SportEvent } from '../types';
import { BlinkMap, type MapViewport } from '../components/BlinkMap';
import { CoverCard, EventRow } from '../components/HomeCards';
import { MapSheet } from '../components/MapSheet';
import { EventDetailPanel } from '../components/EventDetailPanel';
import {
  CountBadge,
  DEFAULT_FILTERS,
  FilterBar,
  FilterIcon,
  FiltersSheet,
  extraFilterCount,
  RADIUS_OPTIONS,
  allFilterCount,
  type HomeFilterState,
  type Radius,
} from '../components/HomeFilters';
import {
  readEventsSnapshot,
  snapshotKey,
  writeEventsSnapshot,
  type SnapshotQuery,
} from '../utils/eventsSnapshot';
import { catalogApi, citiesApi, eventsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { spotsLeft } from '../utils/format';
import {
  DISTANCE_BANDS,
  dayDiff,
  dayKey,
  distanceKm,
  isLive,
  matchesWhen,
  plural,
  type LatLng,
} from '../utils/eventView';

type Item = { e: SportEvent; km: number | null };
type Section = { key: string; title: string; sub?: string; live?: boolean; items: Item[] };

const KRASNOYARSK: LatLng = { lat: 56.0153, lng: 92.8932 };
// В режиме радиуса грузим сразу 10 км — меньшие радиусы и счётчики считаются на клиенте
const RADIUS_FETCH_KM = 10;
// «Без ограничения» в списке — весь город
const CITY_RADIUS_KM = 50;
const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
const evWord = (n: number) => plural(n, 'событие', 'события', 'событий');

export const HomePage: React.FC = () => {
  const { currentUser, ready, preferences } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 'list' : 'map';
  const q = params.get('q') ?? '';

  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filters, setFilters] = useState<HomeFilterState>(DEFAULT_FILTERS);
  const radiusTouched = useRef(false);
  const [debouncedQuery, setDebouncedQuery] = useState(q.trim());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [events, setEvents] = useState<SportEvent[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  // «Искать при перемещении карты»: пока выключено, карта и список показывают все события города
  const [moveSearch, setMoveSearch] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  // Десктоп: список у карты можно свернуть; мобильный: шторка над картой
  const [panelClosed, setPanelClosed] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  // Каталог доступен и без ключа карты; после инициализации 2ГИС уточнит область.
  const [viewport, setViewport] = useState<MapViewport>({ ...KRASNOYARSK, radiusKm: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listColRef = useRef<HTMLDivElement>(null);

  // Точка отсчёта радиуса и расстояний: геопозиция, иначе домашняя точка из профиля
  const origin = useMemo<LatLng | null>(
    () =>
      me ??
      (preferences?.homeLat != null && preferences?.homeLng != null
        ? { lat: preferences.homeLat, lng: preferences.homeLng }
        : null),
    [me, preferences?.homeLat, preferences?.homeLng],
  );
  const radiusOn = filters.radius !== 'all' && !!origin;

  const patchFilters = useCallback((patch: Partial<HomeFilterState>) => {
    if (patch.radius) radiusTouched.current = true;
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    setParams(p, { replace: true });
  };

  useEffect(() => {
    catalogApi.sports().then(setSports).catch(() => setSports([]));
    citiesApi.list().then(setCities).catch(() => setCities([]));
  }, []);

  // Если геолокация уже разрешена — сразу показываем расстояния, без лишнего запроса разрешения
  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') {
          navigator.geolocation.getCurrentPosition((pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
        }
      })
      .catch(() => {});
  }, []);

  // Как в макете: когда известна точка отсчёта, по умолчанию ищем в радиусе 5 км
  useEffect(() => {
    if (origin && !radiusTouched.current) setFilters((f) => (f.radius === 'all' ? { ...f, radius: '5' } : f));
  }, [origin]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Область загрузки: радиус от точки отсчёта; без радиуса — весь город (точка отсчёта или домашний
  // город, иначе Красноярск). Видимая область карты — только если включено «Искать при перемещении карты»
  const selectedCity = cities.find((city) => String(city.id) === params.get('city'));
  const selectedCityCenter = selectedCity ? { lat: selectedCity.lat, lng: selectedCity.lng } : null;
  const cityCenter = selectedCityCenter ?? origin ?? (preferences?.homeCity ? { lat: preferences.homeCity.lat, lng: preferences.homeCity.lng } : KRASNOYARSK);
  const byViewport = view === 'map' && moveSearch;
  const fetchCenter = selectedCityCenter ?? (radiusOn && origin ? origin : byViewport ? viewport : cityCenter);
  const fetchRadius = radiusOn ? RADIUS_FETCH_KM : byViewport ? viewport.radiusKm : CITY_RADIUS_KM;

  useEffect(() => {
    if (selectedCityCenter) setViewport({ ...selectedCityCenter, radiusKm: CITY_RADIUS_KM });
  }, [selectedCityCenter?.lat, selectedCityCenter?.lng]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    // Снимок прошлой загрузки: пины появляются сразу, запрос ниже обновит их актуальными данными
    const snapshot: SnapshotQuery = {
      userId: currentUser?.id,
      lat: fetchCenter.lat,
      lng: fetchCenter.lng,
      radiusKm: fetchRadius,
      sports: filters.sports,
      skill: filters.skill || undefined,
      joinMode: filters.joinMode || undefined,
    };
    const snapshotId = debouncedQuery ? null : snapshotKey(snapshot);
    if (snapshotId) {
      const cached = readEventsSnapshot(snapshotId);
      if (cached) setEvents((prev) => (prev.length ? prev : cached));
    }
    eventsApi
      .list({
        lat: fetchCenter.lat,
        lng: fetchCenter.lng,
        radiusKm: fetchRadius,
        sport: filters.sports,
        q: debouncedQuery || undefined,
        skillLevel: filters.skill || undefined,
        joinMode: filters.joinMode || undefined,
      })
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
        setError(null);
        if (snapshotId) writeEventsSnapshot(snapshotId, list);
      })
      .catch((e) => !cancelled && setError(errorMessage(e, 'Не удалось загрузить мероприятия')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // currentUser?.id — чтобы после смены роли обновились статусы «Вы участвуете»
  }, [
    ready,
    fetchCenter.lat,
    fetchCenter.lng,
    fetchRadius,
    currentUser?.id,
    filters.sports,
    debouncedQuery,
    filters.skill,
    filters.joinMode,
    reloadTick,
  ]);

  // Клиентские фильтры: «когда», радиус, свободные места, бесплатные
  const base = useMemo<Item[]>(
    () =>
      events
        .map((e) => ({ e, km: origin ? distanceKm(origin, e) : null }))
        .filter(({ e }) => matchesWhen(e, filters.when))
        .filter(({ e }) => !filters.freeOnly || spotsLeft(e) > 0)
        .filter(({ e }) => !filters.freeCost || !e.price),
    [events, origin, filters.when, filters.freeOnly, filters.freeCost],
  );

  const visible = useMemo<Item[]>(() => {
    const r = radiusOn ? Number(filters.radius) : Infinity;
    return base
      .filter(({ km }) => km == null || km <= r)
      .sort((a, b) => {
        const friends = (b.e.friendsAttending?.length ?? 0) - (a.e.friendsAttending?.length ?? 0);
        if (friends) return friends;
        const live = Number(isLive(b.e)) - Number(isLive(a.e));
        if (live) return live;
        if (a.km != null && b.km != null) return a.km - b.km;
        return new Date(a.e.startTime).getTime() - new Date(b.e.startTime).getTime();
      });
  }, [base, radiusOn, filters.radius]);

  const radiusCounts = useMemo(() => {
    const counts = {} as Record<Radius, number | null>;
    for (const o of RADIUS_OPTIONS) {
      counts[o.value] =
        o.value === 'all'
          ? radiusOn
            ? null
            : base.length
          : origin
            ? base.filter(({ km }) => km != null && km <= Number(o.value)).length
            : null;
    }
    return counts;
  }, [base, origin, radiusOn]);

  const eventDays = useMemo(() => new Set(events.map((e) => dayKey(new Date(e.startTime)))), [events]);

  const visibleEvents = useMemo(() => visible.map((v) => v.e), [visible]);
  const selectedEvent = visibleEvents.find((e) => e.id === selectedId) ?? null;
  const detailEvent = events.find((e) => e.id === detailId) ?? null;

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    const live = visible.filter(({ e }) => isLive(e));
    if (live.length) out.push({ key: 'live', title: 'Идут сейчас', sub: 'Ещё можно присоединиться', live: true, items: live });
    const rest = visible.filter(({ e }) => !isLive(e));
    if (origin) {
      for (const band of DISTANCE_BANDS) {
        const items = rest.filter(({ km }) => km != null && km >= band.from && km < band.to);
        if (items.length) out.push({ key: band.title, title: band.title, sub: band.sub, items });
      }
    } else {
      // Без геопозиции группируем по дате
      const byDay = (pred: (d: number) => boolean) => rest.filter(({ e }) => pred(dayDiff(new Date(e.startTime))));
      const groups: [string, Item[]][] = [
        ['Сегодня', byDay((d) => d <= 0)],
        ['Завтра', byDay((d) => d === 1)],
        ['Позже', byDay((d) => d > 1)],
      ];
      for (const [title, items] of groups) if (items.length) out.push({ key: title, title, items });
    }
    return out;
  }, [visible, origin]);


  // Синхронизация выбора: прокручиваем список у карты (десктоп) и в шторке (мобильный) к выбранному ряду
  useEffect(() => {
    if (selectedId == null) return;
    for (const box of [listColRef.current]) {
      const el = box?.querySelector<HTMLElement>(`[data-eid="${selectedId}"]`);
      if (box && el && (el.offsetTop < box.scrollTop || el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight))
        box.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    }
  }, [selectedId]);

  const pickOnMap = (event: SportEvent | null) => setSelectedId(event?.id ?? null);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );

  const changeFilters = (patch: Partial<HomeFilterState>) => {
    // Радиус без точки отсчёта — сначала спрашиваем геопозицию
    if (patch.radius && patch.radius !== 'all' && !origin) locate();
    patchFilters(patch);
  };

  const defaultRadius: Radius = origin ? '5' : 'all';
  const resetFilters = () => {
    radiusTouched.current = true;
    setFilters({ ...DEFAULT_FILTERS, radius: defaultRadius });
  };
  const changed = {
    radius: filters.radius !== defaultRadius,
    when: filters.when.kind !== 'all',
    sport: filters.sports.length > 0,
    any: false,
  };
  changed.any = changed.radius || changed.when || changed.sport || extraFilterCount(filters) > 0;

  const openDetail = (event: SportEvent) => {
    setSelectedId(event.id);
    setDetailId(event.id);
  };

  const nextRadius = RADIUS_OPTIONS[RADIUS_OPTIONS.findIndex((o) => o.value === filters.radius) + 1]?.value;
  const widen = () => {
    if (radiusOn && nextRadius) changeFilters({ radius: nextRadius });
    else {
      resetFilters();
      setParam('q', null);
    }
  };

  const resultLine = `${visible.length} ${evWord(visible.length)} ${
    radiusOn ? `в радиусе ${filters.radius} км` : view === 'list' ? 'в городе' : 'в этой области'
  }`;
  const panelTitle = view === 'list' ? 'Лента событий' : 'Рядом с вами';

  const empty = !loading && visible.length === 0 && (
    <div className="flex flex-col items-center text-center gap-2 py-14 px-6">
      <SearchX className="w-10 h-10 text-muted opacity-60" />
      <span className="text-xl font-bold text-ink">Ничего не нашлось</span>
      <span className="text-[15px] text-muted max-w-[300px]">
        {radiusOn
          ? `В радиусе ${filters.radius} км нет подходящих событий. Попробуйте расширить радиус или сбросить фильтры.`
          : 'Попробуйте изменить запрос или сбросить фильтры.'}
      </span>
      <button type="button" onClick={widen} className="mt-2 h-[46px] px-5 rounded-[10px] bg-ink text-page text-base font-bold">
        {radiusOn && nextRadius ? (nextRadius === 'all' ? 'Искать без ограничения' : `Искать в ${nextRadius} км`) : 'Сбросить фильтры'}
      </button>
    </div>
  );

  /* ---------- Мобильная шапка: поиск, фильтры, чипы Радиус / Спорт / Когда ---------- */
  const mobileHeader = (floating: boolean) => (
    <div className="lg:hidden flex flex-col pt-2">
      <div className="flex gap-2 px-3">
        <label
          className={`flex-1 min-w-0 h-[50px] flex items-center gap-2.5 pl-3.5 pr-1.5 rounded-xl bg-card border border-line-2 text-muted focus-within:border-ink ${
            floating ? 'shadow-[0_4px_16px_rgba(20,30,45,0.14)]' : ''
          }`}
        >
          <Search className="w-5 h-5 shrink-0" />
          <input
            type="search"
            aria-label="Поиск мероприятий"
            placeholder="Спорт, место или клуб"
            value={q}
            onChange={(e) => setParam('q', e.target.value || null)}
            className="flex-1 min-w-0 bg-transparent outline-none text-base font-medium text-ink placeholder:text-muted"
          />
          {q && (
            <button
              type="button"
              onClick={() => setParam('q', null)}
              aria-label="Очистить"
              className="shrink-0 w-[38px] h-[38px] rounded-lg bg-surface text-ink flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label="Фильтры"
          className={`relative w-[50px] h-[50px] shrink-0 flex items-center justify-center rounded-xl bg-card border border-line-2 text-ink ${
            floating ? 'shadow-[0_4px_16px_rgba(20,30,45,0.14)]' : ''
          }`}
        >
          <FilterIcon size={22} />
          <CountBadge n={allFilterCount(filters)} className="absolute -top-1.5 -right-1.5 border-2 border-page" />
        </button>
      </div>
      <div className="h-2.5" />
    </div>
  );

  const errorBox = error && (
    <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-800 text-sm">
      {error}
    </div>
  );

  /* ---------- Секции Ленты ---------- */
  const sectionHead = (title: string, n: number, live = false, sub?: string) => (
    <div className="flex items-baseline gap-2.5 pb-1.5 lg:pb-2">
      {live && <span className="self-center w-2.5 h-2.5 rounded-full bg-brand" />}
      <span className="text-xl lg:text-[22px] font-bold text-ink">{title}</span>
      <span className="text-[15px] lg:text-base font-semibold text-muted">{n}</span>
      {sub && <span className="hidden lg:inline text-sm text-muted ml-1">{sub}</span>}
    </div>
  );
  const grid = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3 lg:gap-4';

  const feed = (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-5 lg:px-8 pt-1.5 lg:pt-6 pb-10 flex flex-col gap-5 sm:gap-6 lg:gap-8">
      {errorBox}


      {empty}

      {sections.map((sec) => (
        <div key={sec.key} className="flex flex-col gap-2.5 lg:gap-3">
          {sectionHead(sec.title, sec.items.length, sec.live, sec.sub)}
          <div className={grid}>
            {sec.items.map(({ e }) => (
              <CoverCard key={e.id} event={e} me={origin} active={e.id === detailId} onOpen={() => openDetail(e)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const desktopMode = view === 'list' ? 'feed' : panelClosed ? 'closed' : 'list';

  return (
    <div className="h-full flex flex-col">
      <div className="hidden lg:block">
        <FilterBar
          filters={filters}
          onChange={changeFilters}
          sports={sports}
          radiusCounts={radiusCounts}
          eventDays={eventDays}
          resultCount={visible.length}
          onOpenFilters={() => setFiltersOpen(true)}
          canUseRadius={!!origin}
          changed={changed}
          onResetAll={() => {
            resetFilters();
            setParam('q', null);
          }}
        />
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* ---------- Карта: на десктопе всегда под панелью, на мобильном — только в режиме карты ---------- */}
        <section className={`${view === 'map' ? '' : 'hidden lg:block'} absolute inset-0`}>
          <BlinkMap
            events={visibleEvents}
            center={selectedCityCenter}
            selectedEvent={selectedEvent}
            hoveredId={hoveredId}
            onSelectEvent={pickOnMap}
            me={me}
            onLocate={setMe}
            // Карта под Лентой сообщает область, которую не видно, — её не учитываем
            onViewportChange={(v) => view === 'map' && setViewport(v)}
            onMore={openDetail}
            onJoined={() => setReloadTick((t) => t + 1)}
            showCard={view === 'map' && isDesktop()}
            radius={radiusOn && origin ? { center: origin, km: Number(filters.radius) } : null}
            controlsClassName="top-[84px] right-3 lg:top-4 lg:right-4"
            cardClassName={`bottom-4 ${desktopMode === 'list' ? 'lg:left-[456px]' : ''}`}
          />
          {/* Правый нижний угол; на мобильном — над свёрнутой шторкой, в раскрытой не нужен */}
          {view === 'map' && (
            <label
              className={`absolute right-3 ${selectedEvent ? 'bottom-[218px]' : 'bottom-[120px]'} lg:right-4 lg:bottom-4 z-20 flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-line-2 bg-card text-ink text-xs font-semibold shadow-[0_2px_8px_rgba(20,30,45,0.12)] cursor-pointer select-none`}
            >
              <input
                type="checkbox"
                checked={moveSearch}
                onChange={(e) => setMoveSearch(e.target.checked)}
                className="w-3.5 h-3.5 accent-brand"
              />
              Искать при перемещении
            </label>
          )}
          {loading && view === 'map' && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 hidden lg:flex bg-card border border-line-2 rounded-lg px-3 py-1.5 text-sm text-muted items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Загружаем…
            </div>
          )}
        </section>

        {/* Список скрыт — кнопка вернуть его (десктоп) */}
        {desktopMode === 'closed' && (
          <button
            type="button"
            onClick={() => setPanelClosed(false)}
            className="hidden lg:flex absolute left-4 top-4 z-[21] h-12 pl-3.5 pr-[18px] items-center gap-2.5 rounded-[10px] border border-line-2 bg-card shadow-[0_4px_16px_rgba(20,30,45,0.14)] text-ink text-base font-bold"
          >
            <List className="w-5 h-5" strokeWidth={2.2} />
            Список · {visible.length}
          </button>
        )}

        {/* ---------- Панель: список у карты / Лента (десктоп), Лента на весь экран (мобильный) ---------- */}
        <div
          className={`${view === 'list' ? 'flex' : 'hidden lg:flex'} absolute inset-0 z-20 flex-col bg-page overflow-hidden lg:right-auto lg:border-r lg:border-line-2 lg:transition-[width,transform] lg:duration-300 lg:ease-[cubic-bezier(.2,.8,.2,1)] ${
            desktopMode === 'feed' ? 'lg:w-full' : 'lg:w-[440px]'
          } ${desktopMode === 'closed' ? 'lg:-translate-x-full' : ''}`}
        >
          {view === 'list' && <div className="lg:hidden shrink-0 bg-page">{mobileHeader(false)}</div>}

          {desktopMode !== 'feed' && (
            <div className="hidden lg:flex shrink-0 px-5 py-3.5 items-center gap-2.5 bg-card border-b border-line-2">
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-xl font-bold text-ink">{panelTitle}</span>
                <span className="text-sm font-medium text-muted flex items-center gap-2">
                  {resultLine}
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setParam('view', 'list')}
                className="shrink-0 h-10 px-3 flex items-center gap-2 rounded-[10px] border border-line-2 bg-card text-ink text-[15px] font-semibold hover:bg-surface"
              >
                <Maximize2 className="w-[17px] h-[17px]" />
                Лента
              </button>
              <button
                type="button"
                onClick={() => setPanelClosed(true)}
                aria-label="Скрыть список"
                className="shrink-0 w-10 h-10 rounded-[10px] bg-surface text-ink flex items-center justify-center hover:bg-surface-2"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.4} />
              </button>
            </div>
          )}

          {desktopMode === 'feed' || view === 'list' ? (
            <div className="flex-1 min-h-0 overflow-y-auto">{feed}</div>
          ) : (
            <div ref={listColRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-card">
              {errorBox && <div className="p-4">{errorBox}</div>}
              {visible.map(({ e }) => (
                <EventRow
                  key={e.id}
                  event={e}
                  me={origin}
                  active={e.id === selectedId}
                  onPick={() => setSelectedId(e.id)}
                  onHover={(h) => setHoveredId(h ? e.id : null)}
                />
              ))}
              {empty}
            </div>
          )}
        </div>

        {/* ---------- Мобильная карта: поиск и чипы сверху, шторка снизу ---------- */}
        {view === 'map' && (
          <>
            <div className="lg:hidden absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-page via-page/70 to-transparent">
              {mobileHeader(true)}
            </div>
            <MapSheet
              selected={selectedEvent}
              me={origin}
              onClearSelection={() => setSelectedId(null)}
              onMore={openDetail}
              onJoined={() => setReloadTick((t) => t + 1)}
            />
          </>
        )}

        {/* ---------- Панель события ---------- */}
        {detailEvent && (
          <>
            <div
              className={`fixed inset-0 z-[1400] lg:z-30 bg-[rgba(4,6,10,0.5)] ${view === 'map' ? 'lg:hidden' : 'lg:absolute'}`}
              onClick={() => setDetailId(null)}
            />
            <div className="anim-sheet lg:anim-drawer fixed inset-x-0 bottom-0 top-[10vh] z-[1500] rounded-t-[28px] overflow-hidden flex lg:absolute lg:top-0 lg:bottom-0 lg:left-auto lg:right-0 lg:w-[440px] lg:rounded-none lg:z-40">
              <div className="flex-1 flex flex-col [&>div]:flex-1 [&>div]:min-h-0">
                <EventDetailPanel
                  key={detailEvent.id}
                  event={detailEvent}
                  me={origin}
                  onClose={() => setDetailId(null)}
                  onChanged={() => setReloadTick((t) => t + 1)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {filtersOpen && (
        <FiltersSheet
          filters={filters}
          onChange={changeFilters}
          onReset={resetFilters}
          onClose={() => setFiltersOpen(false)}
          sports={sports}
          eventDays={eventDays}
          resultCount={visible.length}
          compact={isDesktop()}
        />
      )}

    </div>
  );
};
