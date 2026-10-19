import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Loader2, MapPin, PlusCircle } from 'lucide-react';
import { meApi, participationApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Participation, SportEvent } from '../types';
import { ParticipationBadge } from '../components/ParticipationBadge';
import { formatShortDateTime } from '../utils/format';
import { autoRejectReason, isAutoRejected } from '../utils/moderation';

type Tab = 'participating' | 'organizing';

export const MyEventsPage: React.FC = () => {
  const { currentUser, ready } = useAuth();
  const [tab, setTab] = useState<Tab>('participating');
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [managed, setManaged] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';

  const load = useCallback(async () => {
    try {
      const [mine, own] = await Promise.all([meApi.participations(), meApi.events()]);
      setParticipations(mine);
      setManaged(own);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !currentUser) return;
    setLoading(true);
    void load();
  }, [load, ready, currentUser]);

  const cancel = async (p: Participation) => {
    if (!p.event) return;
    try {
      await participationApi.cancel(p.event.id);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (!ready) return null;
  if (!currentUser || isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-700">
        Личный кабинет доступен пользователям и организациям. Переключите роль в верхней панели.
      </div>
    );
  }

  const pendingTotal = managed.reduce((sum, e) => sum + (e.pendingCount ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-3xl font-bold text-slate-900">Мои события</h1>
        <Link
          to="/events/new"
          className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-on-brand px-4 py-2.5 rounded-xl text-sm font-semibold"
        >
          <PlusCircle className="w-4 h-4" /> Создать
        </Link>
      </div>

      <div className="flex border-b border-slate-200 gap-6 mb-6" role="tablist">
        <TabButton active={tab === 'participating'} onClick={() => setTab('participating')}>
          Я участвую ({participations.length})
        </TabButton>
        <TabButton active={tab === 'organizing'} onClick={() => setTab('organizing')}>
          Я организую ({managed.length})
          {pendingTotal > 0 && (
            <span className="ml-2 bg-amber-500 text-snow text-xs font-bold px-2 py-0.5 rounded-full">{pendingTotal}</span>
          )}
        </TabButton>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : tab === 'participating' ? (
        participations.length === 0 ? (
          <Empty text="Вы пока никуда не записались." linkTo="/" linkText="Найти мероприятие" />
        ) : (
          <ul className="space-y-3">
            {participations.map((p) =>
              p.event ? (
                <li key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/events/${p.event.id}`} className="font-bold text-lg text-slate-900 hover:text-brand-ink">
                        {p.event.title}
                      </Link>
                      <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatShortDateTime(p.event.startTime, p.event.timeZone)}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{p.event.address}</span>
                        </div>
                      </div>
                    </div>
                    <ParticipationBadge status={p.status} />
                  </div>
                  {p.decisionComment && p.status !== 'CANCELLED' && (
                    <p className="mt-2 text-sm text-slate-600">Организатор: «{p.decisionComment}»</p>
                  )}
                  {p.event.status !== 'PUBLISHED' && (
                    <p className="mt-2 text-sm text-red-700">Мероприятие снято с публикации: {p.event.unpublishReason}</p>
                  )}
                  {(p.status === 'PENDING' || p.status === 'CONFIRMED') && new Date(p.event.endTime) > new Date() && (
                    <div className="mt-3 text-right">
                      <button onClick={() => cancel(p)} className="text-sm font-semibold text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg">
                        {p.status === 'PENDING' ? 'Отозвать заявку' : 'Отменить участие'}
                      </button>
                    </div>
                  )}
                </li>
              ) : null,
            )}
          </ul>
        )
      ) : managed.length === 0 ? (
        <Empty text="Вы ещё не создавали мероприятий." linkTo="/events/new" linkText="Создать мероприятие" />
      ) : (
        <ul className="space-y-3">
          {managed.map((e) => (
            <li key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/events/${e.id}`} className="font-bold text-lg text-slate-900 hover:text-brand-ink">
                    {e.title}
                  </Link>
                  <div className="text-sm text-slate-600 mt-1">
                    {formatShortDateTime(e.startTime, e.timeZone)} · {e.sport.name} · {e.confirmedCount}/{e.capacity} мест
                  </div>
                  {e.status === 'MODERATION' ? (
                    <div className="text-sm text-amber-800 mt-1">Идёт автоматическая проверка…</div>
                  ) : (
                    e.status !== 'PUBLISHED' && (
                      <div className="text-sm text-red-700 mt-1">
                        {isAutoRejected(e) ? 'Не прошло автопроверку' : 'Снято с публикации'}: {autoRejectReason(e.unpublishReason)}
                      </div>
                    )
                  )}
                </div>
                <Link
                  to={`/events/${e.id}/manage`}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Заявки
                  {!!e.pendingCount && (
                    <span className="bg-amber-500 text-snow text-xs font-bold px-2 py-0.5 rounded-full">{e.pendingCount}</span>
                  )}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`pb-3 text-base font-semibold border-b-2 transition-colors ${
      active ? 'border-brand text-brand-ink' : 'border-transparent text-slate-500 hover:text-slate-800'
    }`}
  >
    {children}
  </button>
);

const Empty: React.FC<{ text: string; linkTo: string; linkText: string }> = ({ text, linkTo, linkText }) => (
  <div className="text-center py-14 text-slate-500">
    <p>{text}</p>
    <Link to={linkTo} className="inline-block mt-3 text-brand-ink font-semibold hover:underline">
      {linkText}
    </Link>
  </div>
);
