import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Hourglass, QrCode, ShieldAlert } from 'lucide-react';
import type { SportEvent, User } from '../../types';
import { autoRejectReason, isAutoRejected } from '../../utils/moderation';
import { Button, buttonClasses } from '../../components/ui';
import type { EventPhase } from './eventPhase';

export interface ParticipationActions {
  join: () => void;
  cancel: () => void;
  claimSpot: () => void;
  showTicket: () => void;
  openScanner: () => void;
  complete: () => void;
}

const leaveClass = 'w-full text-sm font-semibold text-red-700 hover:bg-red-50 py-2.5 rounded-xl';
const bigCta = buttonClasses({ size: 'lg', block: true, className: 'font-bold text-lg py-3.5' });

/**
 * Что пользователь может сделать с мероприятием прямо сейчас: записаться, встать в очередь,
 * показать билет, отозвать заявку; организатору — управление и сканер.
 */
export const ParticipationPanel: React.FC<{
  event: SportEvent;
  phase: EventPhase;
  role: User['role'] | undefined;
  busy: boolean;
  actions: ParticipationActions;
}> = ({ event, phase, role, busy, actions }) => {
  const my = event.myParticipation;
  const { ended, closed, full, archived, unpublished, onReview } = phase;

  if (archived) {
    return (
      <div className="rounded-xl bg-slate-100 border border-slate-200 p-4 text-slate-700 font-semibold">
        Мероприятие завершено и находится в архиве.
        {event.nextOccurrenceId && (
          <Link to={`/events/${event.nextOccurrenceId}`} className="mt-2 block text-brand-ink hover:underline">
            Открыть следующее событие →
          </Link>
        )}
      </div>
    );
  }
  if (unpublished) {
    return (
      <div className={`rounded-xl border p-4 ${onReview ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
        <div className="flex items-center gap-2 font-bold">
          <ShieldAlert className="w-5 h-5" />{' '}
          {onReview ? 'Идёт автоматическая проверка' : isAutoRejected(event) ? 'Не прошло автопроверку' : 'Снято с публикации'}
        </div>
        <p className="text-sm mt-1">
          {onReview ? 'Обычно это несколько секунд — обновите страницу.' : autoRejectReason(event.unpublishReason) || 'Нарушение правил площадки'}
        </p>
        <p className="text-xs mt-2 opacity-80">Запись недоступна.</p>
      </div>
    );
  }
  if (event.canManage) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-brand-tint border border-brand-line p-4 text-brand-ink text-sm">
          <b>Вы организатор этого мероприятия.</b>
          {event.joinMode === 'APPROVAL' && (
            <p className="mt-1">{event.pendingCount ? `Заявок ждут вашего решения: ${event.pendingCount}.` : 'Новых заявок пока нет.'}</p>
          )}
        </div>
        <Link to={`/events/${event.id}/manage`} className={buttonClasses({ size: 'lg', block: true })}>
          Заявки и участники
          {!!event.pendingCount && (
            <span className="bg-on-brand text-brand text-xs font-bold px-2 py-0.5 rounded-full">{event.pendingCount}</span>
          )}
        </Link>
        <button
          type="button"
          onClick={actions.openScanner}
          className="w-full flex items-center justify-center gap-2 text-center bg-ink hover:opacity-90 text-page font-semibold py-3 rounded-xl shadow-sm transition"
        >
          <QrCode className="w-4 h-4 text-brand" />
          Контроль входа (Сканер QR)
        </button>
        {ended && (
          <button type="button" onClick={actions.complete} className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-page hover:opacity-90">
            Завершить событие
          </button>
        )}
      </div>
    );
  }
  if (role === 'ROLE_ADMIN') {
    return (
      <p className="text-sm text-muted bg-surface border border-line rounded-xl p-4">
        Администратор не участвует в мероприятиях — модерация доступна в разделе «Модерация».
      </p>
    );
  }
  if (role === 'ROLE_ORGANIZER') {
    return (
      <p className="text-sm text-muted bg-surface border border-line rounded-xl p-4">
        Организация не участвует в мероприятиях — записаться может только пользователь.
      </p>
    );
  }
  if (my?.status === 'CONFIRMED') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-brand-tint border border-brand-line p-4 text-brand-ink">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-5 h-5 text-brand" /> Вы участвуете!
          </div>
          {my.checkedIn ? (
            <div className="mt-2 text-xs font-semibold text-ink bg-brand-tint-2 rounded-lg p-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
              Вход на мероприятие подтверждён организатором
            </div>
          ) : (
            <p className="text-xs text-brand-ink/80 mt-1">Место забронировано. Покажите QR-код организатору на входе.</p>
          )}
          {my.decisionComment && <p className="text-sm mt-1">Организатор: «{my.decisionComment}»</p>}
        </div>

        {my.ticketCode && (
          <Button size="lg" block onClick={actions.showTicket} className="font-bold py-3.5 shadow-md">
            <QrCode className="w-5 h-5" />
            Показать QR-билет
          </Button>
        )}

        {!ended && (
          <button type="button" onClick={actions.cancel} className={leaveClass}>
            Отменить участие
          </button>
        )}
      </div>
    );
  }
  if (my?.status === 'PENDING') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900">
          <div className="flex items-center gap-2 font-bold">
            <Clock className="w-5 h-5" /> Заявка на рассмотрении
          </div>
          <p className="text-sm mt-1">Организатор ещё не принял решение. Место закрепится после подтверждения.</p>
        </div>
        <button type="button" onClick={actions.cancel} className={leaveClass}>
          Отозвать заявку
        </button>
      </div>
    );
  }
  if (my?.status === 'REJECTED') {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-900">
        <div className="font-bold">Заявка отклонена организатором</div>
        {my.decisionComment && <p className="text-sm mt-1">Причина: «{my.decisionComment}»</p>}
      </div>
    );
  }
  if (ended) return <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">Мероприятие уже завершилось.</p>;
  if (closed) return <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">Приём заявок закрыт.</p>;
  if (my?.status === 'WAITLISTED') {
    return (
      <div className="space-y-3">
        {full ? (
          <div className="rounded-xl bg-surface-2 border border-line p-4 text-ink">
            <div className="flex items-center gap-2 font-bold">
              <Hourglass className="w-5 h-5" /> Вы в очереди
            </div>
            <p className="text-sm mt-1">
              Сейчас мест нет. Когда место освободится, придёт уведомление — оно достанется тому, кто откликнется первым.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-brand-tint border border-brand-line p-4 text-brand-ink">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-brand" /> Освободилось место!
            </div>
            <p className="text-sm mt-1">Займите его, пока не опередили.</p>
            <Button onClick={actions.claimSpot} loading={busy} size="lg" block className="mt-3 font-bold">
              {event.joinMode === 'APPROVAL' ? 'Подать заявку на место' : 'Занять место'}
            </Button>
          </div>
        )}
        <button type="button" onClick={actions.cancel} className={leaveClass}>
          Выйти из очереди
        </button>
      </div>
    );
  }
  if (full) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-4">
          Все места заняты. Встаньте в очередь — если кто-то откажется, мы сообщим вам.
          {!!event.waitlistCount && <span className="block text-xs mt-1 opacity-80">Сейчас в очереди: {event.waitlistCount}</span>}
        </div>
        <button type="button" onClick={actions.join} className={bigCta}>
          Встать в очередь
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={actions.join} className={bigCta}>
        {event.joinMode === 'APPROVAL' ? 'Подать заявку' : 'Записаться'}
      </button>
      {my?.status === 'CANCELLED' && <p className="text-xs text-slate-500 text-center">Вы отменяли запись — можно записаться снова.</p>}
      <p className="text-xs text-slate-500 text-center">
        {event.joinMode === 'APPROVAL' ? 'Участие подтверждает организатор' : 'Вход свободный — запись подтверждается сразу'}
      </p>
    </div>
  );
};
