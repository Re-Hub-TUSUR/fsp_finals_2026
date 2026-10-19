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
  INTEREST: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  SIMILAR: 'bg-sky-50 text-sky-800 border-sky-200',
  HISTORY: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  ORGANIZER: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  POPULAR: 'bg-orange-50 text-orange-800 border-orange-200',
  SPOTS: 'bg-amber-50 text-amber-800 border-amber-200',
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
      <div className="max-w-md mx-auto my-16 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-700">
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
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-emerald-600" /> Рекомендовано для вас
          </h1>
          <p className="text-slate-500 mt-1">
            {where ? `Подобрали ${where}, в радиусе ${loc?.radiusKm} км, на ближайшие 30 дней.` : 'Подбор по вашим интересам, месту и времени.'}
          </p>
          {preferences && preferences.sports.length > 0 && (
            <p className="text-sm text-slate-600 mt-1">
              Ваши интересы: <b>{preferences.sports.map((s) => s.name).join(', ')}</b>
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={locateMe}
            disabled={geoBusy}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border rounded-xl ${
              loc?.source === 'GEO' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {geoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            Рядом со мной
          </button>
          {geo && (
            <button
              onClick={() => setGeo(null)}
              className="px-3.5 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50"
            >
              Мой город
            </button>
          )}
          <button
            onClick={() => setPrefsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
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
        <div className="mb-5 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>Пока мы мало о вас знаем, поэтому показываем популярное рядом. Отметьте интересы — подборка станет точнее.</span>
          <button onClick={() => setPrefsOpen(true)} className="shrink-0 px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold text-sm">
            Указать интересы
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : data?.needsLocation ? (
        <div className="max-w-lg mx-auto text-center py-12">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Где вы занимаетесь?</h2>
          <p className="text-slate-600 mt-1 mb-5">Укажите город и интересы или разрешите определить местоположение.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setPrefsOpen(true)} className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold">
              Указать город и интересы
            </button>
            <button onClick={locateMe} className="px-5 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700">
              Определить местоположение
            </button>
          </div>
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          Рядом пока нет подходящих мероприятий. Увеличьте радиус в интересах или{' '}
          <Link to="/events/new" className="text-emerald-700 font-semibold hover:underline">
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

      <details className="mt-10 bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600">
        <summary className="font-semibold text-slate-800 cursor-pointer">Как мы подбираем мероприятия</summary>
        <ul className="mt-3 space-y-1.5 list-disc ml-5">
          <li>Берём только актуальные события рядом: опубликованные, с открытой регистрацией и свободными местами.</li>
          <li>Учитываем ваши интересы и то, куда вы уже ходили; похожие виды спорта — по выбору людей с похожими интересами.</li>
          <li>Ближе и скорее — выше; подходящий уровень и удобное время (по местному времени события) — плюс.</li>
          <li>«Не интересно» скрывает событие и понижает похожие. Мы не показываем больше двух событий одного вида подряд.</li>
        </ul>
      </details>

      {hidden && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1500] bg-slate-900 text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-4 text-sm">
          <span>Скрыли «{hidden.event.title}»</span>
          <button onClick={undo} className="font-semibold text-emerald-300 hover:text-emerald-200">
            Вернуть
          </button>
          <button onClick={() => setHidden(null)} aria-label="Закрыть" className="text-slate-400 hover:text-white">
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
    <article className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          {e.sport.name}
        </span>
        <button
          onClick={onDismiss}
          title="Не интересно"
          aria-label={`Не интересно: ${e.title}`}
          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg -mt-1 -mr-1"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-bold text-slate-900 text-lg leading-snug">
        <Link to={`/events/${e.id}`} onClick={onOpen} className="hover:text-emerald-700">
          {e.title}
        </Link>
      </h3>

      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {formatShortDateTime(e.startTime, e.timeZone)}
            {isForeignZone(e.timeZone) && <span className="text-slate-400"> (местное)</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{e.address}</span>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Почему мы это рекомендуем">
        {item.reasons.map((r) => (
          <li
            key={r.code + r.text}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${
              REASON_STYLES[r.code] ?? 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {REASON_ICONS[r.code]}
            {r.text}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4 flex items-center justify-between text-sm">
        <span className="text-slate-600">
          {formatPrice(e.price)} · свободно {spotsLeft(e)} из {e.capacity}
        </span>
        <Link
          to={`/events/${e.id}`}
          onClick={onOpen}
          className="font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg"
        >
          {e.joinMode === 'APPROVAL' ? 'Подать заявку' : 'Записаться'}
        </Link>
      </div>
    </article>
  );
};
