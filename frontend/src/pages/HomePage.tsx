import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, LocateFixed, Loader2, Search, SearchX, X } from 'lucide-react';
import type { RecommendationItem, Sport, SportEvent } from '../types';
import { BlinkMap, type MapViewport } from '../components/BlinkMap';
import { CarouselCard, CompactCard, CoverCard } from '../components/HomeCards';
import { EventDetailPanel } from '../components/EventDetailPanel';
import {
  CountBadge,
  DEFAULT_FILTERS,
  FilterBar,
  FilterIcon,
  FiltersSheet,
  RADIUS_OPTIONS,
  RadiusList,
  SportList,
  allFilterCount,
  radiusValue,
  sportsLabel,
  type HomeFilterState,
  type Radius,
} from '../components/HomeFilters';
import { Modal } from '../components/Modal';
import { Chip } from '../components/ui';
import { catalogApi, eventsApi, recommendationsApi } from '../api';
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
  const [filters, setFilters] = useState<HomeFilterState>(DEFAULT_FILTERS);
  const radiusTouched = useRef(false);
  const [debouncedQuery, setDebouncedQuery] = useState(q.trim());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radiusSheetOpen, setRadiusSheetOpen] = useState(false);
  const [sportSheetOpen, setSportSheetOpen] = useState(false);

  const [events, setEvents] = useState<SportEvent[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  // Каталог доступен и без ключа карты; после инициализации 2ГИС уточнит область.
  const [viewport, setViewport] = useState<MapViewport>({ ...KRASNOYARSK, radiusKm: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listColRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

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

  // Область загрузки: радиус от точки отсчёта; без радиуса на карте — видимая область,
  // в «Списке» (карта скрыта) — город: точка отсчёта или домашний город, иначе Красноярск
  const cityCenter = origin ?? (preferences?.homeCity ? { lat: preferences.homeCity.lat, lng: preferences.homeCity.lng } : KRASNOYARSK);
  const fetchCenter = radiusOn && origin ? origin : view === 'list' ? cityCenter : viewport;
  const fetchRadius = radiusOn ? RADIUS_FETCH_KM : view === 'list' ? CITY_RADIUS_KM : viewport.radiusKm;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    eventsApi
      .list({
        // Без радиуса каталог ограничен видимой областью карты — в масштабе страны иначе не обойтись
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

  // Рекомендации — только в «Списке» и без поискового запроса
  useEffect(() => {
    if (!ready || !currentUser || currentUser.role === 'ROLE_ADMIN' || view !== 'list') return;
    let cancelled = false;
    recommendationsApi
      .get({ lat: origin?.lat, lng: origin?.lng, limit: 5 })
      .then((r) => !cancelled && setRecs(r.items))
      .catch(() => !cancelled && setRecs([]));
    return () => {
      cancelled = true;
    };
  }, [ready, currentUser, view, origin, reloadTick]);

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
  const detailEvent =
    events.find((e) => e.id === detailId) ?? recs.find((r) => r.event.id === detailId)?.event ?? null;

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

  const recItems = useMemo(
    () => (q.trim() ? [] : recs.filter((r) => spotsLeft(r.event) > 0).slice(0, 4)),
    [recs, q],
  );

  // Синхронизация выбора: прокручиваем колонку (десктоп) и карусель (мобильный) к выбранной карточке
  useEffect(() => {
    if (selectedId == null) return;
    const col = listColRef.current;
    const colEl = col?.querySelector<HTMLElement>(`[data-eid="${selectedId}"]`);
    if (col && colEl) col.scrollTo({ top: colEl.offsetTop - 16, behavior: 'smooth' });
    const car = carouselRef.current;
    const carEl = car?.querySelector<HTMLElement>(`[data-eid="${selectedId}"]`);
    if (car && carEl) car.scrollTo({ left: carEl.offsetLeft - 12, behavior: 'smooth' });
  }, [selectedId]);

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

  const resetFilters = () => {
    radiusTouched.current = true;
    setFilters({ ...DEFAULT_FILTERS, radius: origin ? '5' : 'all' });
  };

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

  const empty = !loading && visible.length === 0 && (
    <div className="flex flex-col items-center text-center gap-2 py-14 px-6">
      <SearchX className="w-10 h-10 text-muted opacity-60" />
      <span className="text-lg font-bold text-ink">Ничего не нашлось</span>
      <span className="text-sm text-muted max-w-sm">
        {radiusOn
          ? `В радиусе ${filters.radius} км нет подходящих событий. Попробуйте расширить радиус или сбросить фильтры.`
          : 'Попробуйте изменить запрос или сбросить фильтры.'}
      </span>
      <button type="button" onClick={widen} className="mt-2 h-11 px-5 rounded-[14px] bg-ink text-white text-[15px] font-semibold">
        {radiusOn && nextRadius ? (nextRadius === 'all' ? 'Искать без ограничения' : `Искать в ${nextRadius} км`) : 'Сбросить фильтры'}
      </button>
    </div>
  );

  /* ---------- Мобильная шапка: поиск, фильтры, радиус, чипы ---------- */
  const mobileHeader = (floating: boolean) => (
    <div className="lg:hidden flex flex-col gap-2 pt-3 pb-2.5">
      <div className="flex gap-2 px-3">
        <label
          className={`flex-1 min-w-0 h-12 flex items-center gap-2.5 pl-3.5 pr-1.5 rounded-2xl bg-white border border-line text-muted focus-within:ring-2 focus-within:ring-brand/40 ${
            floating ? 'shadow-card' : ''
          }`}
        >
          <Search className="w-5 h-5 shrink-0" />
          <input
            type="search"
            aria-label="Поиск мероприятий"
            placeholder="Спорт, место или клуб"
            value={q}
            onChange={(e) => setParam('q', e.target.value || null)}
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-medium text-ink placeholder:text-muted"
          />
          {q && (
            <button
              type="button"
              onClick={() => setParam('q', null)}
              aria-label="Очистить"
              className="shrink-0 w-9 h-9 rounded-xl bg-surface text-ink flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label="Фильтры"
          className={`relative w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl bg-white border border-line text-ink ${
            floating ? 'shadow-card' : ''
          }`}
        >
          <FilterIcon />
          <CountBadge n={allFilterCount(filters)} className="absolute -top-1.5 -right-1.5 border-2 border-page" />
        </button>
      </div>
      <div className="flex gap-1.5 px-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setRadiusSheetOpen(true)}
          className={`shrink-0 h-9 pl-[11px] pr-2.5 flex items-center gap-1.5 rounded-full border border-line bg-white text-ink text-sm font-bold whitespace-nowrap ${
            floating ? 'shadow-[0_2px_8px_rgba(10,20,45,0.10)]' : ''
          }`}
        >
          <LocateFixed className="w-4 h-4" />
          {radiusValue(filters.radius)}
          <ChevronDown className="w-4 h-4 text-muted" />
        </button>
        <Chip floating={floating} active={filters.sports.length > 0} onClick={() => setSportSheetOpen(true)}>
          {sportsLabel(filters.sports, sports)}
        </Chip>
      </div>
    </div>
  );

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
        />
      </div>

      <div className="relative flex-1 min-h-0">
        {/* ---------- Карта ---------- */}
        <section className={`${view === 'map' ? '' : 'hidden'} absolute inset-0 lg:left-[420px]`}>
          <BlinkMap
            events={visibleEvents}
            selectedEvent={selectedEvent}
            onSelectEvent={(e) => setSelectedId(e?.id ?? null)}
            me={me}
            onLocate={setMe}
            // Скрытая карта (режим «Список») сообщает вырожденную область — её не учитываем
            onViewportChange={(v) => view === 'map' && setViewport(v)}
            onMore={openDetail}
            showCard={isDesktop()}
            radius={radiusOn && origin ? { center: origin, km: Number(filters.radius) } : null}
            controlsClassName="top-[124px] right-3 lg:top-4 lg:right-4"
            cardClassName="bottom-3 lg:bottom-4"
          />
          {loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden lg:flex bg-white shadow-card border border-line rounded-full px-3 py-1.5 text-sm text-muted items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Загружаем…
            </div>
          )}
        </section>

        {/* Колонка событий слева от карты (десктоп) */}
        {view === 'map' && (
          <div
            ref={listColRef}
            className="hidden lg:flex absolute left-0 top-0 bottom-0 w-[420px] flex-col gap-2.5 p-4 overflow-y-auto bg-page border-r border-line"
          >
            <span className="px-1 text-[13px] font-semibold text-muted">{resultLine}</span>
            {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm">{error}</div>}
            {visible.map(({ e }) => (
              <CompactCard key={e.id} event={e} me={origin} active={e.id === selectedId} onPick={() => setSelectedId(e.id)} />
            ))}
            {empty}
          </div>
        )}

        {/* Мобильная карта: поиск сверху, карусель снизу */}
        {view === 'map' && (
          <>
            <div className="lg:hidden absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-page via-page/70 to-transparent">
              {mobileHeader(true)}
            </div>
            <div
              ref={carouselRef}
              className="lg:hidden absolute inset-x-0 bottom-3 z-20 flex gap-2 px-3 overflow-x-auto no-scrollbar snap-x snap-proximity scroll-pl-3"
            >
              {visible.map(({ e }) => (
                <CarouselCard
                  key={e.id}
                  event={e}
                  active={e.id === selectedId}
                  onPick={() => setSelectedId(e.id)}
                  onMore={() => openDetail(e)}
                />
              ))}
            </div>
          </>
        )}

        {/* ---------- Список ---------- */}
        {view === 'list' && (
          <div className="absolute inset-0 overflow-y-auto bg-page">
            <div className="lg:hidden sticky top-0 z-20 bg-page">{mobileHeader(false)}</div>
            <div className="max-w-[1360px] mx-auto px-3 lg:px-6 pt-2 lg:pt-5 pb-10 flex flex-col gap-7">
              <div className="px-1 flex items-center gap-2 text-[15px] font-semibold text-muted">
                {resultLine}
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm">{error}</div>}

              {recItems.length > 0 && (
                <div className="flex flex-col gap-3">
                  <span className="px-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink">Рекомендации для вас</span>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x -mx-3 px-3 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">
                    {recItems.map((r) => (
                      <div key={r.event.id} className="shrink-0 w-[300px] lg:w-auto snap-start">
                        <CoverCard event={r.event} me={origin} onOpen={() => openDetail(r.event)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {empty}

              {sections.map((sec) => (
                <div key={sec.key} className="flex flex-col gap-3">
                  <div className="px-1 flex items-center gap-2 flex-wrap">
                    {sec.live && (
                      <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-brand)_25%,transparent)]" />
                    )}
                    <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">{sec.title}</span>
                    <span className="text-[15px] font-semibold text-muted">{sec.items.length}</span>
                    {sec.sub && <span className="hidden lg:inline text-sm text-muted ml-1">{sec.sub}</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 lg:gap-4">
                    {sec.items.map(({ e }) => (
                      <CoverCard key={e.id} event={e} me={origin} active={e.id === detailId} onOpen={() => openDetail(e)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      {sportSheetOpen && (
        <Modal title="Вид спорта" onClose={() => setSportSheetOpen(false)}>
          <SportList selected={filters.sports} sports={sports} onChange={(s) => changeFilters({ sports: s })} />
        </Modal>
      )}

      {radiusSheetOpen && (
        <Modal title="Радиус от вас" onClose={() => setRadiusSheetOpen(false)}>
          {!origin && (
            <p className="mb-2 text-sm text-muted">Радиус считается от вашей геопозиции или от домашнего города из профиля.</p>
          )}
          <RadiusList
            value={filters.radius}
            counts={radiusCounts}
            onChange={(radius) => {
              changeFilters({ radius });
              setRadiusSheetOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
};
