import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CalendarClock,
  Clock,
  EyeOff,
  Flame,
  Heart,
  History,
  Loader2,
  LocateFixed,
  MapPin,
  Settings2,
  Sparkles,
  Target,
  Ticket,
  Users,
} from 'lucide-react';
import { recommendationsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { RecommendationItem, Recommendations } from '../types';
import { Modal } from '../components/Modal';
import { PreferencesForm } from '../components/PreferencesForm';
import { formatPrice, formatShortDateTime, isForeignZone, spotsLeft } from '../utils/format';

const REASON_ICONS: Record<string, React.ReactNode> = {
  INTEREST: <Heart className="w-3.5 h-3.5" />,
  SIMILAR: <Users className="w-3.5 h-3.5" />,
  HISTORY: <History className="w-3.5 h-3.5" />,
  ORGANIZER: <BadgeCheck className="w-3.5 h-3.5" />,
  NEAR: <MapPin className="w-3.5 h-3.5" />,
  SOON: <Clock className="w-3.5 h-3.5" />,
  SKILL: <Target className="w-3.5 h-3.5" />,
  TIME: <CalendarClock className="w-3.5 h-3.5" />,
  POPULAR: <Flame className="w-3.5 h-3.5" />,
  SPOTS: <Ticket className="w-3.5 h-3.5" />,
};

const REASON_STYLES: Record<string, string> = {
  INTEREST: 'bg-brand-tint text-brand-ink border-brand-line',
  SIMILAR: 'bg-surface text-ink border-line',
  HISTORY: 'bg-surface text-ink border-line',
  ORGANIZER: 'bg-surface text-ink border-line',
  POPULAR: 'bg-warn-tint text-warn-ink border-transparent',
  SPOTS: 'bg-warn-tint text-warn-ink border-transparent',
};

type GeoState = { lat: number; lng: number } | null;

export const RecommendedPage: React.FC = () => {
  const { currentUser, ready, preferences, refreshPreferences } = useAuth();
  const [data, setData] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoState>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [hidden, setHidden] = useState<RecommendationItem | null>(null);

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';

  const load = useCallback(async (point: GeoState) => {
    setLoading(true);
    try {
      setData(await recommendationsApi.get({ lat: point?.lat, lng: point?.lng, limit: 20 }));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось загрузить рекомендации'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !currentUser || isAdmin) {
      setLoading(false);
      return;
    }
    void load(geo);
  }, [ready, currentUser, isAdmin, geo, load]);

  const locateMe = () => {
    if (!navigator.geolocation) return setError('Геолокация недоступна в этом браузере');
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setGeoBusy(false);
        setError('Не удалось определить местоположение — разрешите доступ к геолокации или укажите город в интересах');
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  const dismiss = async (item: RecommendationItem, position: number) => {
    setData((d) => (d ? { ...d, items: d.items.filter((i) => i.event.id !== item.event.id) } : d));
    setHidden(item);
    try {
      await recommendationsApi.feedback(item.event.id, 'DISMISS', data?.requestId, position);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const undo = async () => {
    if (!hidden) return;
    const item = hidden;
    setHidden(null);
    try {
      await recommendationsApi.undoDismiss(item.event.id);
      await load(geo);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const click = (item: RecommendationItem, position: number) => {
    // Не ждём ответа: клик — только сигнал для модели, переход не задерживаем
    void recommendationsApi.feedback(item.event.id, 'CLICK', data?.requestId, position).catch(() => undefined);
  };

  if (!ready) return null;
  if (!currentUser || isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-surface border border-line rounded-[20px] text-center text-ink">
        Рекомендации доступны пользователям. Переключите роль в верхней панели.
      </div>
    );
  }

  const loc = data?.location;
  const where = loc
    ? loc.source === 'GEO'
      ? 'рядом с вами'
      : `в городе ${loc.cityName ?? ''}`
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-ink flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-brand-ink" /> Рекомендовано для вас
          </h1>
          <p className="text-muted mt-1">
            {where ? `Подобрали ${where}, в радиусе ${loc?.radiusKm} км, на ближайшие 30 дней.` : 'Подбор по вашим интересам, месту и времени.'}
          </p>
          {preferences && preferences.sports.length > 0 && (
            <p className="text-sm text-muted mt-1">
              Ваши интересы: <b className="text-ink">{preferences.sports.map((s) => s.name).join(', ')}</b>
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={locateMe}
            disabled={geoBusy}
            className={`flex items-center gap-1.5 px-3.5 h-11 text-sm font-semibold border rounded-xl transition-colors ${
              loc?.source === 'GEO' ? 'bg-brand-tint border-brand-line text-brand-ink' : 'bg-card border-line text-ink hover:bg-surface'
            }`}
          >
            {geoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            Рядом со мной
          </button>
          {geo && (
            <button
              onClick={() => setGeo(null)}
              className="px-3.5 h-11 text-sm font-semibold border border-line rounded-xl bg-card text-ink hover:bg-surface transition-colors"
            >
              Мой город
            </button>
          )}
          <button
            onClick={() => setPrefsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 h-11 text-sm font-semibold rounded-xl bg-ink text-white hover:opacity-90 transition-opacity"
          >
            <Settings2 className="w-4 h-4" /> Мои интересы
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      {data?.coldStart && !data.needsLocation && (
        <div className="mb-5 p-4 rounded-[18px] bg-brand-tint border border-brand-line text-brand-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>Пока мы мало о вас знаем, поэтому показываем популярное рядом. Отметьте интересы — подборка станет точнее.</span>
          <button onClick={() => setPrefsOpen(true)} className="shrink-0 px-4 h-10 rounded-xl bg-brand text-on-brand hover:bg-brand-hover font-semibold text-sm transition-colors">
            Указать интересы
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-muted">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : data?.needsLocation ? (
        <div className="max-w-lg mx-auto text-center py-12">
          <MapPin className="w-10 h-10 text-muted mx-auto mb-3" />
          <h2 className="text-xl font-bold text-ink">Где вы занимаетесь?</h2>
          <p className="text-muted mt-1 mb-5">Укажите город и интересы или разрешите определить местоположение.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setPrefsOpen(true)} className="px-5 h-12 rounded-xl bg-brand text-on-brand hover:bg-brand-hover font-semibold transition-colors">
              Указать город и интересы
            </button>
            <button onClick={locateMe} className="px-5 h-12 rounded-xl border border-line bg-card font-semibold text-ink hover:bg-surface transition-colors">
              Определить местоположение
            </button>
          </div>
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center py-16 text-muted">
          Рядом пока нет подходящих мероприятий. Увеличьте радиус в интересах или{' '}
          <Link to="/events/new" className="text-brand-ink font-semibold hover:underline">
            создайте своё
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.items.map((item, position) => (
            <RecommendationCard
              key={item.event.id}
              item={item}
              onOpen={() => click(item, position)}
              onDismiss={() => dismiss(item, position)}
            />
          ))}
        </div>
      )}

      <details className="mt-10 bg-card border border-line rounded-[20px] p-5 text-sm text-muted">
        <summary className="font-semibold text-ink cursor-pointer">Как мы подбираем мероприятия</summary>
        <ul className="mt-3 space-y-1.5 list-disc ml-5">
          <li>Берём только актуальные события рядом: опубликованные, с открытой регистрацией и свободными местами.</li>
          <li>Учитываем ваши интересы и то, куда вы уже ходили; похожие виды спорта — по выбору людей с похожими интересами.</li>
          <li>Ближе и скорее — выше; подходящий уровень и удобное время (по местному времени события) — плюс.</li>
          <li>«Не интересно» скрывает событие и понижает похожие. Мы не показываем больше двух событий одного вида подряд.</li>
        </ul>
      </details>

      {hidden && (
        <div className="anim-rise fixed bottom-4 left-1/2 -translate-x-1/2 z-[1500] bg-ink text-white rounded-xl shadow-card px-4 py-3 flex items-center gap-4 text-sm">
          <span>Скрыли «{hidden.event.title}»</span>
          <button onClick={undo} className="font-semibold underline underline-offset-2 hover:opacity-80">
            Вернуть
          </button>
          <button onClick={() => setHidden(null)} aria-label="Закрыть" className="opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {prefsOpen && (
        <Modal title="Мои интересы" onClose={() => setPrefsOpen(false)} wide>
          <PreferencesForm
            initial={preferences}
            onCancel={() => setPrefsOpen(false)}
            onSaved={async () => {
              setPrefsOpen(false);
              await refreshPreferences();
              await load(geo);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

const RecommendationCard: React.FC<{ item: RecommendationItem; onOpen: () => void; onDismiss: () => void }> = ({
  item,
  onOpen,
  onDismiss,
}) => {
  const e = item.event;
  return (
    <article className="anim-rise bg-card rounded-[20px] border border-line p-5 hover:shadow-card hover:-translate-y-0.5 transition-[box-shadow,transform] flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-ink bg-brand-tint px-2.5 py-1 rounded-lg border border-brand-line">
          {e.sport.name}
        </span>
        <button
          onClick={onDismiss}
          title="Не интересно"
          aria-label={`Не интересно: ${e.title}`}
          className="text-muted hover:text-ink hover:bg-surface p-1.5 rounded-lg -mt-1 -mr-1 transition-colors"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-bold text-ink text-lg leading-snug tracking-[-0.01em]">
        <Link to={`/events/${e.id}`} onClick={onOpen} className="hover:text-brand-ink transition-colors">
          {e.title}
        </Link>
      </h3>

      <div className="mt-2 space-y-1 text-sm text-muted">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            {formatShortDateTime(e.startTime, e.timeZone)}
            {isForeignZone(e.timeZone) && <span> (местное)</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{e.address}</span>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Почему мы это рекомендуем">
        {item.reasons.map((r) => (
          <li
            key={r.code + r.text}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${
              REASON_STYLES[r.code] ?? 'bg-surface text-ink border-line'
            }`}
          >
            {REASON_ICONS[r.code]}
            {r.text}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4 flex items-center justify-between text-sm">
        <span className="text-muted">
          {formatPrice(e.price)} · свободно {spotsLeft(e)} из {e.capacity}
        </span>
        <Link
          to={`/events/${e.id}`}
          onClick={onOpen}
          className="font-semibold bg-brand text-on-brand hover:bg-brand-hover px-3.5 py-2 rounded-xl transition-colors"
        >
          {e.joinMode === 'APPROVAL' ? 'Подать заявку' : 'Записаться'}
        </Link>
      </div>
    </article>
  );
};
