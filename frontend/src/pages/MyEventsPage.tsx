import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Calendar, CheckCircle2, Loader2, MapPin, PlusCircle, QrCode } from 'lucide-react';
import { meApi, participationApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Participation, SportEvent } from '../types';
import { ParticipationBadge } from '../components/ParticipationBadge';
import { TicketModal } from '../components/TicketModal';
import { CancelParticipationDialog } from '../components/CancelParticipationDialog';
import { ErrorNotice } from '../components/ui';
import { formatShortDateTime } from '../utils/format';
import { autoRejectReason, isAutoRejected } from '../utils/moderation';

type Tab = 'participating' | 'organizing' | 'archive';

export const MyEventsPage: React.FC = () => {
  const { currentUser, ready } = useAuth();
  const [tab, setTab] = useState<Tab>('participating');
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [managed, setManaged] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Participation | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<{ event: SportEvent; participation: Participation } | null>(null);

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

  const cancel = async () => {
    if (!cancelTarget?.event) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      await participationApi.cancel(cancelTarget.event.id);
      setCancelTarget(null);
      await load();
    } catch (e) {
      setCancelError(errorMessage(e));
    } finally {
      setCancelBusy(false);
    }
  };

  const reload = () => {
    setLoading(true);
    void load();
  };

  if (!ready) return null;
  if (!currentUser || isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-700">
        Личный кабинет доступен пользователям и организациям. Переключите роль в верхней панели.
      </div>
    );
  }

  const activeParticipations = participations.filter((p) => p.event?.status !== 'ARCHIVED');
  const activeManaged = managed.filter((e) => e.status !== 'ARCHIVED');
  const archivedParticipations = participations.filter((p) => p.event?.status === 'ARCHIVED' && p.status === 'CONFIRMED');
  const archivedManaged = managed.filter((e) => e.status === 'ARCHIVED');
  const pendingTotal = activeManaged.reduce((sum, e) => sum + (e.pendingCount ?? 0), 0);
  const archiveTotal = archivedParticipations.length + archivedManaged.length;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 w-full min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Мои события</h1>
        <Link
          to="/events/new"
          className="flex items-center gap-1.5 sm:gap-2 bg-brand hover:bg-brand-hover text-on-brand px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> Создать
        </Link>
      </div>

      <div className="flex border-b border-slate-200 gap-3 sm:gap-6 mb-6 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0" role="tablist">
        <TabButton active={tab === 'participating'} onClick={() => setTab('participating')}>
          Я участвую ({activeParticipations.length})
        </TabButton>
        <TabButton active={tab === 'organizing'} onClick={() => setTab('organizing')}>
          Я организую ({activeManaged.length})
          {pendingTotal > 0 && (
            <span className="ml-2 bg-amber-500 text-snow text-xs font-bold px-2 py-0.5 rounded-full">{pendingTotal}</span>
          )}
        </TabButton>
        <TabButton active={tab === 'archive'} onClick={() => setTab('archive')}>
          <span className="inline-flex items-center gap-1.5"><Archive className="h-4 w-4" /> Архив ({archiveTotal})</span>
        </TabButton>
      </div>

      {error && <ErrorNotice message={error} onRetry={reload} className="mb-4" />}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : tab === 'participating' ? (
        activeParticipations.length === 0 ? (
          <Empty text="Вы пока никуда не записались." linkTo="/" linkText="Найти мероприятие" />
        ) : (
          <ul className="space-y-3">
            {activeParticipations.map((p) =>
              p.event ? (
                <li key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/events/${p.event.id}`} className="font-bold text-lg text-slate-900 hover:text-brand-ink break-words">
                        {p.event.title}
                      </Link>
                      <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="break-words">{formatShortDateTime(p.event.startTime, p.event.timeZone)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{p.event.address}</span>
                        </div>
                      </div>
                    </div>
                    <ParticipationBadge status={p.status} />
                  </div>
                  {p.decisionComment && p.status !== 'CANCELLED' && (
                    <p className="mt-2 text-sm text-slate-600 break-words">Организатор: «{p.decisionComment}»</p>
                  )}
                  {p.event.status !== 'PUBLISHED' && (
                    <p className="mt-2 text-sm text-red-700 break-words">Мероприятие снято с публикации: {p.event.unpublishReason}</p>
                  )}
                  {p.status === 'CONFIRMED' && p.ticketCode && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      {p.checkedIn ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Вход подтверждён {p.checkedInAt ? `(${p.checkedInAt.slice(11, 16)})` : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Билет: <code className="font-mono font-bold text-slate-800">{p.ticketCode}</code>
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedTicket({ event: p.event!, participation: p })}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand text-on-brand hover:bg-brand-hover px-3 py-1.5 rounded-xl transition shadow-sm shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Показать билет
                      </button>
                    </div>
                  )}
                  {(p.status === 'PENDING' || p.status === 'CONFIRMED' || p.status === 'WAITLISTED') && new Date(p.event.endTime) > new Date() && (
                    <div className="mt-3 text-right">
                      <button onClick={() => { setCancelError(null); setCancelTarget(p); }} className="text-sm font-semibold text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg">
                        {p.status === 'PENDING' ? 'Отозвать заявку' : p.status === 'WAITLISTED' ? 'Выйти из очереди' : 'Отменить участие'}
                      </button>
                    </div>
                  )}
                </li>
              ) : null,
            )}
          </ul>
        )
      ) : tab === 'organizing' ? activeManaged.length === 0 ? (
        <Empty text="Вы ещё не создавали мероприятий." linkTo="/events/new" linkText="Создать мероприятие" />
      ) : (
        <ul className="space-y-3">
          {activeManaged.map((e) => (
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
      ) : archiveTotal === 0 ? (
        <div className="py-14 text-center text-slate-500">В архиве пока нет завершённых событий.</div>
      ) : (
        <div className="space-y-7">
          {archivedManaged.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">Я организовал</h2>
              <ArchiveList events={archivedManaged} />
            </section>
          )}
          {archivedParticipations.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">Я участвовал</h2>
              <ArchiveList events={archivedParticipations.flatMap((p) => p.event ? [p.event] : [])} />
            </section>
          )}
        </div>
      )}

      {selectedTicket && (
        <TicketModal
          event={selectedTicket.event}
          ticketCode={selectedTicket.participation.ticketCode!}
          participantName={currentUser.fullName}
          participantAvatar={currentUser.avatarUrl}
          checkedIn={selectedTicket.participation.checkedIn}
          checkedInAt={selectedTicket.participation.checkedInAt}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      {cancelTarget?.event && (
        <CancelParticipationDialog
          status={cancelTarget.status}
          eventTitle={cancelTarget.event.title}
          busy={cancelBusy}
          error={cancelError}
          onConfirm={() => void cancel()}
          onClose={() => setCancelTarget(null)}
        />
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
    className={`pb-3 text-sm sm:text-base font-semibold border-b-2 transition-colors shrink-0 whitespace-nowrap ${
      active ? 'border-brand text-brand-ink' : 'border-transparent text-slate-500 hover:text-slate-800'
    }`}
  >
    {children}
  </button>
);

const ArchiveList: React.FC<{ events: SportEvent[] }> = ({ events }) => (
  <ul className="space-y-3">
    {events.map((event) => (
      <li key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Link to={`/events/${event.id}`} className="font-bold text-slate-900 hover:text-brand-ink">{event.title}</Link>
        <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-slate-600">
          <span>{formatShortDateTime(event.startTime, event.timeZone)}</span>
          <span>{event.sport.name}</span>
          <span>{event.address}</span>
        </div>
      </li>
    ))}
  </ul>
);

const Empty: React.FC<{ text: string; linkTo: string; linkText: string }> = ({ text, linkTo, linkText }) => (
  <div className="text-center py-14 text-slate-500">
    <p>{text}</p>
    <Link to={linkTo} className="inline-block mt-3 text-brand-ink font-semibold hover:underline">
      {linkText}
    </Link>
  </div>
);
