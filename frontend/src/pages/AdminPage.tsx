import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Building2, CheckCircle, EyeOff, Loader2, MessageSquare, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi, commentsApi } from '../api';
import { errorMessage } from '../api/client';
import type { AdminOrganization, EventComment, SportEvent } from '../types';
import { Modal } from '../components/Modal';
import { inputClass, labelClass } from '../components/FieldInput';
import { formatShortDateTime } from '../utils/format';

type Target = { kind: 'org'; item: AdminOrganization } | { kind: 'event'; item: SportEvent };

const ORG_STATUS: Record<AdminOrganization['status'], { label: string; cls: string }> = {
  PENDING: { label: 'На рассмотрении', cls: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Одобрено', cls: 'bg-brand-tint-2 text-brand-ink' },
  REJECTED: { label: 'Отклонено', cls: 'bg-red-100 text-red-700' },
};

export const AdminPage: React.FC = () => {
  const { currentUser, ready } = useAuth();
  const [tab, setTab] = useState<'orgs' | 'events' | 'comments'>('orgs');
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';

  const load = useCallback(async () => {
    try {
      const [o, e, c] = await Promise.all([
        adminApi.organizations(),
        adminApi.events(),
        commentsApi.adminList().catch(() => []),
      ]);
      setOrgs(o);
      setEvents(e);
      setComments(c);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && isAdmin) void load();
    else if (ready) setLoading(false);
  }, [ready, isAdmin, load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setTarget(null);
      setReason('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-red-900 mb-1">Доступ ограничен</h2>
        <p className="text-sm text-red-700">
          Раздел доступен только администратору. Переключите роль в верхней панели на «🛡️ Администратор».
        </p>
      </div>
    );
  }

  const pending = orgs.filter((o) => o.status === 'PENDING').length;
  const tabClass = (active: boolean) =>
    `pb-3 text-base font-semibold transition-all border-b-2 flex items-center gap-2 ${
      active ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand text-on-brand flex items-center justify-center shadow-md">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Панель администратора</h1>
          <p className="text-sm text-slate-500">Модерация организаций и мероприятий</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-6 mb-6">
        <button onClick={() => setTab('orgs')} className={tabClass(tab === 'orgs')}>
          <Building2 className="w-4 h-4" />
          Организации {pending > 0 && <span className="bg-amber-500 text-snow text-xs font-bold px-2 py-0.5 rounded-full">{pending}</span>}
        </button>
        <button onClick={() => setTab('events')} className={tabClass(tab === 'events')}>
          <Ban className="w-4 h-4" />
          Мероприятия ({events.length})
        </button>
        <button onClick={() => setTab('comments')} className={tabClass(tab === 'comments')}>
          <MessageSquare className="w-4 h-4" />
          Комментарии ({comments.length})
        </button>
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
      ) : tab === 'orgs' ? (
        <div className="space-y-4">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{org.name}</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${ORG_STATUS[org.status].cls}`}>
                    {ORG_STATUS[org.status].label}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{org.description}</p>
                <span className="text-xs text-slate-400 mt-2 block">
                  Владелец: {org.ownerName} ({org.ownerEmail})
                </span>
                {org.rejectReason && <span className="text-xs text-red-600 mt-1 block">Причина отказа: {org.rejectReason}</span>}
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                {org.status !== 'APPROVED' && (
                  <button
                    onClick={() => run(() => adminApi.approveOrg(org.id))}
                    disabled={busy}
                    className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-on-brand px-3.5 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Одобрить
                  </button>
                )}
                {org.status !== 'REJECTED' && (
                  <button
                    onClick={() => {
                      setReason('');
                      setTarget({ kind: 'org', item: org });
                    }}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    <XCircle className="w-4 h-4" />
                    Отклонить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'events' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Снятое с публикации мероприятие исчезает с карты и из поиска; по прямой ссылке видна причина, запись закрыта.
          </p>
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                ev.status === 'PUBLISHED' ? 'border-slate-200' : 'border-red-200 bg-red-50/40'
              }`}
            >
              <div className="min-w-0">
                <span className="text-xs font-bold text-brand-ink bg-brand-tint px-2 py-0.5 rounded">{ev.sport.name}</span>
                <Link to={`/events/${ev.id}`} className="block font-semibold text-slate-900 hover:text-brand-ink mt-1">
                  {ev.title}
                </Link>
                <p className="text-sm text-slate-500">
                  {ev.organizerName} · {formatShortDateTime(ev.startTime, ev.timeZone)}
                </p>
                {ev.status !== 'PUBLISHED' && <p className="text-sm text-red-700 mt-1">Снято: {ev.unpublishReason}</p>}
              </div>
              {ev.status === 'PUBLISHED' ? (
                <button
                  onClick={() => {
                    setReason('');
                    setTarget({ kind: 'event', item: ev });
                  }}
                  className="text-sm bg-red-50 text-red-700 hover:bg-red-100 font-semibold px-4 py-2.5 rounded-xl shrink-0"
                >
                  Снять с публикации
                </button>
              ) : (
                <button
                  onClick={() => run(() => adminApi.publish(ev.id))}
                  disabled={busy}
                  className="flex items-center gap-1.5 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold px-4 py-2.5 rounded-xl shrink-0"
                >
                  <RotateCcw className="w-4 h-4" /> Вернуть
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Модерация вопросов и сообщений в чатах мероприятий. Скрытые сообщения больше не видны участникам.
          </p>
          {comments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
              Пока нет комментариев
            </div>
          ) : (
            comments.map((cm) => (
              <div
                key={cm.id}
                className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  cm.hidden ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Link
                      to={`/events/${cm.eventId}`}
                      className="text-xs font-bold text-brand-ink bg-brand-tint px-2 py-0.5 rounded hover:underline"
                    >
                      {cm.eventTitle}
                    </Link>
                    <span className="text-xs font-semibold text-slate-800">{cm.authorName}</span>
                    {cm.organizer && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Организатор
                      </span>
                    )}
                    {cm.hidden && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Скрыто
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{formatShortDateTime(cm.createdAt)}</span>
                  </div>
                  <p className={`text-sm mt-1.5 break-words ${cm.hidden ? 'italic text-slate-400' : 'text-slate-800'}`}>
                    {cm.text}
                  </p>
                </div>
                {!cm.hidden && (
                  <button
                    onClick={() => run(() => commentsApi.hide(cm.eventId, cm.id))}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 hover:bg-red-100 font-semibold px-3 py-2 rounded-xl shrink-0 self-start"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Скрыть
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {target && (
        <Modal
          title={target.kind === 'org' ? `Отклонить «${target.item.name}»` : 'Снять с публикации'}
          onClose={() => setTarget(null)}
        >
          {target.kind === 'event' && <p className="text-slate-700 mb-3">{target.item.title}</p>}
          <label htmlFor="reason" className={labelClass}>
            Причина (увидит автор) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            rows={3}
            maxLength={500}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
            placeholder={target.kind === 'org' ? 'Например: не указана площадка' : 'Например: недопустимое место сбора'}
          />
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-5">
            <button
              onClick={() => setTarget(null)}
              className="px-5 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              disabled={busy || !reason.trim()}
              onClick={() =>
                run(() =>
                  target.kind === 'org'
                    ? adminApi.rejectOrg(target.item.id, reason.trim())
                    : adminApi.unpublish(target.item.id, reason.trim()),
                )
              }
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-snow font-semibold disabled:opacity-50"
            >
              {target.kind === 'org' ? 'Подтвердить отказ' : 'Снять с публикации'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
