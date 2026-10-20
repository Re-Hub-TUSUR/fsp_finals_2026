import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarPlus, Share2, UserPlus } from 'lucide-react';
import { eventsApi, participationApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useNow } from '../hooks/useNow';
import { JoinDialog } from '../components/JoinDialog';
import { EventDiscussion } from '../components/EventDiscussion';
import { TicketModal } from '../components/TicketModal';
import { CheckInScannerModal } from '../components/CheckInScannerModal';
import { InviteFriendsModal } from '../components/InviteFriendsModal';
import { ShareEventModal } from '../components/ShareEventModal';
import { Modal } from '../components/Modal';
import { spotsLeft } from '../utils/format';
import { LoadingBlock } from '../components/ui';
import { EventDetailsCard, EventMainCard, OrgDetailsCard } from './event/EventFacts';
import { EventHeaderCard, EventStatusBanners } from './event/EventHeader';
import { ParticipationPanel } from './event/ParticipationPanel';
import { eventPhase } from './event/eventPhase';

type Dialog = 'join' | 'cancel' | 'complete' | 'ticket' | 'scanner' | 'invite' | 'share';
/** Когда перечитать мероприятие после действия: только при успехе, всегда или не нужно (ответ уже содержит его). */
type Refresh = 'success' | 'always' | 'never';

export const EventPage: React.FC = () => {
  const { id } = useParams();
  const { currentUser, ready } = useAuth();
  const now = useNow();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // currentUser?.id — после смены роли меняются myParticipation и canManage
  const {
    data: event,
    loading,
    error,
    reload,
    mutate,
  } = useApi(() => eventsApi.get(id!), [id, currentUser?.id], {
    enabled: ready && !!id,
    errorFallback: 'Не удалось загрузить мероприятие',
  });

  const closeDialog = () => setDialog(null);

  /** Действие над мероприятием: блокирует кнопки, показывает ошибку, по успеху закрывает диалог. */
  const act = async (action: () => Promise<unknown>, refresh: Refresh) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      closeDialog();
      if (refresh === 'success') reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
      if (refresh === 'always') reload();
    }
  };

  if (!ready || loading) return <LoadingBlock />;
  if (error || !event) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-2" />
        <p className="text-red-900 font-semibold">{error ?? 'Мероприятие не найдено'}</p>
        {error && (
          <button
            type="button"
            onClick={reload}
            className="mt-4 mr-4 h-9 px-4 rounded-xl bg-white border border-red-200 font-semibold text-red-800 hover:bg-red-100"
          >
            Повторить
          </button>
        )}
        <Link to="/" className="inline-block mt-4 text-brand-ink font-semibold">
          ← К каталогу
        </Link>
      </div>
    );
  }

  const my = event.myParticipation;
  const phase = eventPhase(event, now);
  const { full } = phase;
  // Звать друзей может пользователь, пока мероприятие опубликовано и запись открыта (то же правило — на сервере)
  const canInvite = currentUser?.role === 'ROLE_USER' && event.status === 'PUBLISHED' && !phase.closed;
  const filled = Math.min(100, Math.round((event.confirmedCount / event.capacity) * 100));

  const actions = {
    join: () => setDialog('join'),
    cancel: () => setDialog('cancel'),
    showTicket: () => setDialog('ticket'),
    openScanner: () => setDialog('scanner'),
    complete: () => setDialog('complete'),
    // Отклик из очереди: место занимает первый откликнувшийся, остальным сервер отвечает «Место уже заняли»
    claimSpot: () => void act(() => participationApi.join(event.id, {}), 'always'),
  };
  const cancelParticipation = () => act(() => participationApi.cancel(event.id), 'success');
  const completeEvent = () => act(() => eventsApi.complete(event.id).then((updated) => mutate(() => updated)), 'never');

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 w-full min-w-0 overflow-x-hidden">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> К каталогу
      </Link>

      <EventStatusBanners event={event} phase={phase} />

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 lg:gap-6 items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-5 min-w-0">
          <div className="order-1 lg:order-none">
            <EventHeaderCard event={event} onInvite={canInvite ? () => setDialog('invite') : undefined} />
          </div>

          <div className="order-3 lg:order-none space-y-5 min-w-0">
            <EventMainCard event={event} />
            <EventDetailsCard event={event} />
            {event.orgDetails && <OrgDetailsCard org={event.orgDetails} />}
          </div>

          <div className="order-3 lg:order-none">
            <EventDiscussion
              eventId={event.id}
              eventTitle={event.title}
              isEventOrganizer={Boolean(event.canManage)}
            />
          </div>
        </div>

        <aside className="order-2 self-start lg:order-none space-y-4">
          <div className="bg-card rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-sm text-slate-500">Места</span>
                <span className="text-lg font-bold text-slate-900">
                  {event.confirmedCount} / {event.capacity}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full ${full ? 'bg-amber-500' : 'bg-brand'}`} style={{ width: `${filled}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {full ? 'Мест нет' : `Свободно: ${spotsLeft(event)}`}
              </p>
            </div>

            <ParticipationPanel event={event} phase={phase} role={currentUser?.role} busy={busy} actions={actions} />
            {actionError && <p className="text-sm text-red-700">{actionError}</p>}

            {/* Социальные действия: Позвать друзей и Поделиться */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              {canInvite && (
                <button
                  type="button"
                  onClick={() => setDialog('invite')}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <UserPlus className="w-4 h-4 text-brand" />
                  <span>Позвать друзей</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDialog('share')}
                className={`w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${
                  !canInvite ? 'col-span-2' : ''
                }`}
              >
                <Share2 className="w-4 h-4 text-slate-600" />
                <span>Поделиться</span>
              </button>
            </div>
          </div>

          <a
            href={eventsApi.icsUrl(event.id)}
            download
            className="flex items-center justify-center gap-2 bg-card border border-slate-200 hover:bg-slate-50 rounded-xl py-3 text-sm font-semibold text-slate-700"
          >
            <CalendarPlus className="w-4 h-4" /> Добавить в календарь (.ics)
          </a>
        </aside>
      </div>

      {dialog === 'join' && (
        <JoinDialog
          event={event}
          waitlist={full}
          onClose={closeDialog}
          onDone={() => {
            closeDialog();
            reload();
          }}
        />
      )}
      {dialog === 'cancel' && (
        <Modal
          title={my?.status === 'PENDING' ? 'Отозвать заявку?' : my?.status === 'WAITLISTED' ? 'Выйти из очереди?' : 'Отменить участие?'}
          onClose={closeDialog}
        >
          <p className="text-slate-700 mb-5">
            {my?.status === 'PENDING'
              ? 'Организатор больше не увидит вашу заявку. Позже можно подать её снова.'
              : my?.status === 'WAITLISTED'
                ? 'Вы больше не будете получать уведомления об освободившихся местах. Позже можно встать в очередь снова.'
                : 'Место освободится для других участников. Позже можно записаться снова, если останутся места.'}
          </p>
          {actionError && <p className="text-sm text-red-700 mb-3">{actionError}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button onClick={closeDialog} className="px-5 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
              Назад
            </button>
            <button
              onClick={cancelParticipation}
              disabled={busy}
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-snow font-semibold disabled:opacity-60"
            >
              {my?.status === 'PENDING' ? 'Отозвать' : 'Отменить участие'}
            </button>
          </div>
        </Modal>
      )}
      {dialog === 'complete' && (
        <Modal title="Завершить событие?" onClose={closeDialog}>
          <p className="text-slate-700">Событие будет перенесено в архив организатора и подтверждённых участников.{event.recurrenceRule !== 'NONE' && event.recurrenceIntervalDays ? ` Следующее событие автоматически создастся через ${event.recurrenceIntervalDays} дн.` : ''}</p>
          {actionError && <p className="mt-3 text-sm text-red-700">{actionError}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeDialog} className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold">Отмена</button>
            <button type="button" disabled={busy} onClick={completeEvent} className="rounded-xl bg-ink px-4 py-2.5 font-semibold text-page disabled:opacity-50">{busy ? 'Завершение...' : 'Завершить'}</button>
          </div>
        </Modal>
      )}

      {dialog === 'ticket' && my?.ticketCode && (
        <TicketModal
          event={event}
          ticketCode={my.ticketCode}
          participantName={currentUser?.fullName ?? 'Участник'}
          participantAvatar={currentUser?.avatarUrl}
          checkedIn={my.checkedIn}
          checkedInAt={my.checkedInAt}
          onClose={closeDialog}
        />
      )}

      {dialog === 'scanner' && (
        <CheckInScannerModal
          event={event}
          onCheckInSuccess={reload}
          onClose={closeDialog}
        />
      )}

      {dialog === 'invite' && (
        <InviteFriendsModal
          event={event}
          open
          onClose={closeDialog}
          onInvited={reload}
        />
      )}

      {dialog === 'share' && (
        <ShareEventModal
          event={event}
          open
          onClose={closeDialog}
        />
      )}
    </div>
  );
};
