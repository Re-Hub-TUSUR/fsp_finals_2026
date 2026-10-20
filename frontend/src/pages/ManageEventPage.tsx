import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Check, CheckCircle2, Download, Loader2, MessageSquare, QrCode, ShieldAlert, UserCheck, X } from 'lucide-react';
import { downloadParticipantsCsv } from '../utils/exportCsv';
import { eventsApi, participationApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { FieldDef, FieldValue, Participation, SportEvent } from '../types';
import { Modal } from '../components/Modal';
import { CheckInScannerModal } from '../components/CheckInScannerModal';
import { ParticipationBadge } from '../components/ParticipationBadge';
import { displayValue, inputClass, labelClass } from '../components/FieldInput';
import { formatShortDateTime } from '../utils/format';

const Answers: React.FC<{ fields: FieldDef[]; answers?: Record<string, FieldValue> }> = ({ fields, answers }) => {
  const rows = fields
    .map((f) => ({ f, text: displayValue(f, answers?.[f.key]) }))
    .filter((r) => r.text !== null);
  if (rows.length === 0) return null;
  return (
    <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm bg-slate-50 rounded-xl p-3">
      {rows.map(({ f, text }) => (
        <div key={f.key}>
          <dt className="text-xs text-slate-400">{f.label}</dt>
          <dd className="text-slate-800">{text}</dd>
        </div>
      ))}
    </dl>
  );
};

export const ManageEventPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { currentUser, ready } = useAuth();
  const [event, setEvent] = useState<SportEvent | null>(null);
  const [items, setItems] = useState<Participation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Participation | null>(null);
  const [reason, setReason] = useState('');
  const [scannerOpen, setScannerOpen] = useState(searchParams.get('scanner') === '1');

  const handleExportCsv = () => {
    if (!event) return;
    downloadParticipantsCsv(event, items);
  };

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [ev, list] = await Promise.all([eventsApi.get(id), participationApi.forEvent(id)]);
      setEvent(ev);
      setItems(list);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось загрузить заявки'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkInDirect = async (ticketCode: string) => {
    if (!event) return;
    setActionError(null);
    try {
      await participationApi.checkIn(event.id, ticketCode);
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    void load();
  }, [load, ready, currentUser?.id]);

  const groups = useMemo(
    () => ({
      pending: items.filter((p) => p.status === 'PENDING'),
      confirmed: items.filter((p) => p.status === 'CONFIRMED'),
      waitlisted: items.filter((p) => p.status === 'WAITLISTED'),
      other: items.filter((p) => p.status === 'REJECTED' || p.status === 'CANCELLED'),
    }),
    [items],
  );

  const decide = async (p: Participation, decision: 'CONFIRMED' | 'REJECTED', comment?: string) => {
    if (!event) return;
    setBusyId(p.id);
    setActionError(null);
    try {
      await participationApi.decide(event.id, p.id, decision, comment);
      setRejecting(null);
      setReason('');
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
        <ShieldAlert className="w-10 h-10 text-red-600 mx-auto mb-2" />
        <p className="text-red-900 font-semibold">{error ?? 'Мероприятие не найдено'}</p>
        <Link to="/my" className="inline-block mt-4 text-brand-ink font-semibold">
          ← Мои события
        </Link>
      </div>
    );
  }

  const full = event.confirmedCount >= event.capacity;
  const questions = event.registrationFields ?? [];

  const card = (p: Participation) => (
    <li key={p.id} className="bg-card rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <img src={p.user?.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover bg-slate-200 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{p.user?.fullName}</span>
            <ParticipationBadge status={p.status} />
          </div>
          <div className="text-xs text-slate-400">Заявка от {formatShortDateTime(p.createdAt)}</div>
          {p.message && (
            <p className="mt-2 text-sm text-slate-700 flex gap-2">
              <MessageSquare className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
              <span>{p.message}</span>
            </p>
          )}
          <Answers fields={questions} answers={p.answers} />
          {p.decisionComment && <p className="mt-2 text-sm text-slate-500">Ваш комментарий: «{p.decisionComment}»</p>}
          {p.status === 'CONFIRMED' && p.ticketCode && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                Билет: {p.ticketCode}
              </span>
              {p.checkedIn ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-brand-tint-2 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Вход подтверждён {p.checkedInAt ? `(${p.checkedInAt.slice(11, 16)})` : ''}
                </span>
              ) : (
                <button
                  onClick={() => checkInDirect(p.ticketCode!)}
                  disabled={busyId === p.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-brand hover:bg-brand-hover text-on-brand px-3 py-1 rounded-lg transition shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Отметить вход
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {(p.status === 'PENDING' || p.status === 'CONFIRMED' || p.status === 'REJECTED') && (
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          {p.status !== 'CONFIRMED' && (
            <button
              onClick={() => decide(p, 'CONFIRMED')}
              disabled={busyId === p.id || full}
              title={full ? 'Все места заняты' : undefined}
              className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover disabled:bg-slate-200 disabled:text-slate-400 text-on-brand px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              <Check className="w-4 h-4" />
              {p.status === 'REJECTED' ? 'Всё же принять' : 'Принять'}
            </button>
          )}
          {p.status !== 'REJECTED' && (
            <button
              onClick={() => {
                setActionError(null);
                setRejecting(p);
              }}
              disabled={busyId === p.id}
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              <X className="w-4 h-4" />
              {p.status === 'CONFIRMED' ? 'Исключить' : 'Отклонить'}
            </button>
          )}
        </div>
      )}
    </li>
  );

  const section = (title: string, list: Participation[], empty: string) => (
    <section>
      <h2 className="text-lg font-bold text-slate-900 mb-3">
        {title} <span className="text-slate-400 font-normal">({list.length})</span>
      </h2>
      {list.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : <ul className="space-y-3">{list.map(card)}</ul>}
    </section>
  );

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 w-full min-w-0 overflow-x-hidden">
      <Link to={`/events/${event.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> К мероприятию
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 break-words">{event.title}</h1>
      <p className="text-slate-500 mb-5 break-words">
        {formatShortDateTime(event.startTime, event.timeZone)} · {event.address}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card text-ink rounded-2xl p-4 sm:p-5 mb-6 shadow-card border border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-tint text-brand-ink flex items-center justify-center font-bold shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base leading-snug">Контроль входа и проверка QR-билетов</div>
            <p className="text-xs text-muted mt-0.5">
              Отмечено на площадке:{' '}
              <b className="text-brand-ink">
                {groups.confirmed.filter((p) => p.checkedIn).length}
              </b>{' '}
              из {groups.confirmed.length} участников
            </p>
          </div>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={items.length === 0}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 border border-line bg-card hover:bg-surface text-ink font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50"
            title="Экспорт списка участников в CSV / Excel"
          >
            <Download className="w-4 h-4 text-brand-ink" />
            Экспорт в CSV
          </button>
          <button
            onClick={() => setScannerOpen(true)}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-brand hover:bg-brand-hover text-on-brand font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition active:scale-98"
          >
            <Camera className="w-4 h-4" />
            Сканировать QR / Ввести код
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-slate-200 p-4 mb-6 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-sm text-slate-500">Подтверждённые участники</div>
          <div className="text-2xl font-bold text-slate-900">
            {event.confirmedCount} <span className="text-slate-400 font-normal">из {event.capacity}</span>
          </div>
        </div>
        <div className="text-right text-sm text-slate-500">
          {event.joinMode === 'APPROVAL' ? 'Участие по заявке' : 'Свободный вход'}
          {full && <div className="text-amber-700 font-semibold">Мест нет</div>}
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {actionError}
        </div>
      )}

      <div className="space-y-8">
        {event.joinMode === 'APPROVAL' && section('Ждут решения', groups.pending, 'Новых заявок нет.')}
        {section('Участники', groups.confirmed, 'Пока никого нет.')}
        {groups.waitlisted.length > 0 &&
          section(`Очередь (${groups.waitlisted.length})`, groups.waitlisted, '')}
        {groups.other.length > 0 && section('Отклонённые и отменённые', groups.other, '')}
      </div>

      {rejecting && (
        <Modal
          title={rejecting.status === 'CONFIRMED' ? 'Исключить участника?' : 'Отклонить заявку?'}
          onClose={() => setRejecting(null)}
        >
          <p className="text-slate-700 mb-4">{rejecting.user?.fullName}</p>
          <label htmlFor="reject-reason" className={labelClass}>
            Комментарий для участника
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            maxLength={500}
            placeholder="Необязательно: например, «Состав уже собран»"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          />
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-5">
            <button
              onClick={() => setRejecting(null)}
              className="px-5 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Назад
            </button>
            <button
              onClick={() => decide(rejecting, 'REJECTED', reason)}
              disabled={busyId === rejecting.id}
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-snow font-semibold disabled:opacity-60"
            >
              {rejecting.status === 'CONFIRMED' ? 'Исключить' : 'Отклонить'}
            </button>
          </div>
        </Modal>
      )}

      {scannerOpen && (
        <CheckInScannerModal
          event={event}
          onCheckInSuccess={() => void load()}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
};
