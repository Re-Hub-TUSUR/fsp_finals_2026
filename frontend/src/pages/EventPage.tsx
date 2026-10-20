import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Hourglass,
  Loader2,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Share2,
  ShieldAlert,
  Trophy,
  User as UserIcon,
  UserPlus,
  Users,
} from 'lucide-react';
import { eventsApi, participationApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { SportEvent } from '../types';
import { JoinDialog } from '../components/JoinDialog';
import { EventDiscussion } from '../components/EventDiscussion';
import { TicketModal } from '../components/TicketModal';
import { CheckInScannerModal } from '../components/CheckInScannerModal';
import { InviteFriendsModal } from '../components/InviteFriendsModal';
import { ShareEventModal } from '../components/ShareEventModal';
import { MiniMap } from '../components/MiniMap';
import { RouteButton } from '../components/RouteButton';
import { useEventWeather } from '../components/EventWeather';
import { Modal } from '../components/Modal';
import { displayValue } from '../components/FieldInput';
import {
  JOIN_MODE_LABELS,
  SKILL_LABELS,
  formatAges,
  formatDateTime,
  formatPrice,
  formatShortDateTime,
  formatTime,
  isForeignZone,
  registrationClosesAt,
  utcLabel,
  spotsLeft,
} from '../utils/format';
import { ATTENTION_SYMBOL, MODERATION_CATEGORY_LABELS, autoRejectReason, isAutoRejected, needsAdminAttention } from '../utils/moderation';

const Fact: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span>
    <div>
      <div className="text-sm text-slate-500 font-semibold">{label}</div>
      <div className="text-base text-slate-900">{children}</div>
    </div>
  </div>
);

const WeatherFact: React.FC<{ event: SportEvent }> = ({ event }) => {
  const weather = useEventWeather(event);
  if (!weather) return null;
  return (
    <Fact icon={<weather.Icon className="w-5 h-5" />} label="Погода в это время">
      {weather.title}
      <span className="block text-xs text-slate-500">{weather.details}</span>
    </Fact>
  );
};

export const EventPage: React.FC = () => {
  const { id } = useParams();
  const { currentUser, ready } = useAuth();
  const [event, setEvent] = useState<SportEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setEvent(await eventsApi.get(id));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось загрузить мероприятие'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    void load();
  }, [load, ready, currentUser?.id]);

  const cancelParticipation = async () => {
    if (!event) return;
    setBusy(true);
    setActionError(null);
    try {
      await participationApi.cancel(event.id);
      setCancelOpen(false);
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /** Отклик из очереди: место занимает первый откликнувшийся, остальным сервер отвечает «Место уже заняли». */
  const claimSpot = async () => {
    if (!event) return;
    setBusy(true);
    setActionError(null);
    try {
      await participationApi.join(event.id, {});
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
      await load();
    }
  };

  const completeEvent = async () => {
    if (!event) return;
    setBusy(true);
    setActionError(null);
    try {
      setEvent(await eventsApi.complete(event.id));
      setCompleteOpen(false);
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
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
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-2" />
        <p className="text-red-900 font-semibold">{error ?? 'Мероприятие не найдено'}</p>
        <Link to="/" className="inline-block mt-4 text-brand-ink font-semibold">
          ← К каталогу
        </Link>
      </div>
    );
  }

  const org = event.orgDetails;
  const my = event.myParticipation;
  const now = new Date();
  const ended = new Date(event.endTime) <= now;
  const closed = ended || registrationClosesAt(event) <= now;
  const full = event.confirmedCount >= event.capacity;
  const archived = event.status === 'ARCHIVED';
  const unpublished = event.status !== 'PUBLISHED' && !archived;
  const onReview = event.status === 'MODERATION';
  // Звать друзей может пользователь, пока мероприятие опубликовано и запись открыта (то же правило — на сервере)
  const canInvite = currentUser?.role === 'ROLE_USER' && event.status === 'PUBLISHED' && !closed;
  const autoRejected = isAutoRejected(event);
  const ages = formatAges(event.minAge, event.maxAge);
  const filled = Math.min(100, Math.round((event.confirmedCount / event.capacity) * 100));
  const templateFacts = (event.fields ?? [])
    .map((f) => ({ field: f, text: displayValue(f, event.details?.[f.key]) }))
    .filter((x) => x.text !== null);

  const panel = (() => {
    if (archived) {
      return <div className="rounded-xl bg-slate-100 border border-slate-200 p-4 text-slate-700 font-semibold">Мероприятие завершено и находится в архиве.{event.nextOccurrenceId && <Link to={`/events/${event.nextOccurrenceId}`} className="mt-2 block text-brand-ink hover:underline">Открыть следующее событие →</Link>}</div>;
    }
    if (unpublished) {
      return (
        <div className={`rounded-xl border p-4 ${onReview ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-5 h-5" />{' '}
            {onReview ? 'Идёт автоматическая проверка' : autoRejected ? 'Не прошло автопроверку' : 'Снято с публикации'}
          </div>
          <p className="text-sm mt-1">
            {onReview
              ? 'Обычно это несколько секунд — обновите страницу.'
              : autoRejectReason(event.unpublishReason) || 'Нарушение правил площадки'}
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
              <p className="mt-1">
                {event.pendingCount
                  ? `Заявок ждут вашего решения: ${event.pendingCount}.`
                  : 'Новых заявок пока нет.'}
              </p>
            )}
          </div>
          <Link
            to={`/events/${event.id}/manage`}
            className="block text-center bg-brand hover:bg-brand-hover text-on-brand font-semibold py-3 rounded-xl shadow-sm"
          >
            Заявки и участники
            {!!event.pendingCount && (
              <span className="ml-2 bg-on-brand text-brand text-xs font-bold px-2 py-0.5 rounded-full">
                {event.pendingCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setScannerOpen(true)}
            className="w-full flex items-center justify-center gap-2 text-center bg-ink hover:opacity-90 text-page font-semibold py-3 rounded-xl shadow-sm transition active:scale-98"
          >
            <QrCode className="w-4 h-4 text-brand" />
            Контроль входа (Сканер QR)
          </button>
          {ended && (
            <button
              onClick={() => setCompleteOpen(true)}
              className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-page hover:opacity-90"
            >
              Завершить событие
            </button>
          )}
        </div>
      );
    }
    if (currentUser?.role === 'ROLE_ADMIN') {
      return (
        <p className="text-sm text-muted bg-surface border border-line rounded-xl p-4">
          Администратор не участвует в мероприятиях — модерация доступна в разделе «Модерация».
        </p>
      );
    }
    if (currentUser?.role === 'ROLE_ORGANIZER') {
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
            <button
              onClick={() => setTicketOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-on-brand font-bold py-3.5 rounded-xl shadow-md transition active:scale-98"
            >
              <QrCode className="w-5 h-5" />
              Показать QR-билет
            </button>
          )}

          {!ended && (
            <button onClick={() => setCancelOpen(true)} className="w-full text-sm font-semibold text-red-700 hover:bg-red-50 py-2.5 rounded-xl">
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
          <button onClick={() => setCancelOpen(true)} className="w-full text-sm font-semibold text-red-700 hover:bg-red-50 py-2.5 rounded-xl">
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
              <button
                onClick={() => void claimSpot()}
                disabled={busy}
                className="mt-3 w-full bg-brand hover:bg-brand-hover text-on-brand font-bold py-3 rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-5 h-5 animate-spin" />}
                {event.joinMode === 'APPROVAL' ? 'Подать заявку на место' : 'Занять место'}
              </button>
            </div>
          )}
          <button onClick={() => setCancelOpen(true)} className="w-full text-sm font-semibold text-red-700 hover:bg-red-50 py-2.5 rounded-xl">
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
          <button
            onClick={() => setJoinOpen(true)}
            className="w-full bg-brand hover:bg-brand-hover text-on-brand font-bold text-lg py-3.5 rounded-xl shadow-sm active:scale-[0.99] transition"
          >
            Встать в очередь
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <button
          onClick={() => setJoinOpen(true)}
          className="w-full bg-brand hover:bg-brand-hover text-on-brand font-bold text-lg py-3.5 rounded-xl shadow-sm active:scale-[0.99] transition"
        >
          {event.joinMode === 'APPROVAL' ? 'Подать заявку' : 'Записаться'}
        </button>
        {my?.status === 'CANCELLED' && <p className="text-xs text-slate-500 text-center">Вы отменяли запись — можно записаться снова.</p>}
        <p className="text-xs text-slate-500 text-center">
          {event.joinMode === 'APPROVAL'
            ? 'Участие подтверждает организатор'
            : 'Вход свободный — запись подтверждается сразу'}
        </p>
      </div>
    );
  })();

  const organizerProfileUrl = event.byOrganization
    ? `/profiles/organizations/${event.organizationId}`
    : `/profiles/users/${event.organizerUserId}`;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 w-full min-w-0 overflow-x-hidden">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> К каталогу
      </Link>

      {unpublished && (
        <div
          className={`mb-5 p-4 rounded-xl border flex gap-3 ${
            onReview ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <div>
            <b>
              {onReview
                ? 'Мероприятие проходит автоматическую проверку.'
                : autoRejected
                  ? 'Мероприятие не прошло автоматическую проверку.'
                  : 'Мероприятие снято с публикации администратором.'}
            </b>
            {!onReview && (
              <p className="text-sm mt-0.5">
                Причина: {autoRejectReason(event.unpublishReason) || 'Нарушение правил площадки'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Только для администратора: сомнительное мероприятие, которое пропустил ИИ */}
      {event.moderation && needsAdminAttention(event) && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex gap-3">
          <span className="text-xl leading-none shrink-0" aria-hidden="true">{ATTENTION_SYMBOL}</span>
          <div className="text-sm">
            <b className="text-base">Автопроверка: требует внимания</b>
            {event.moderation.reason && <p className="mt-0.5">{event.moderation.reason}</p>}
            {event.moderation.hits.length > 0 && (
              <p className="mt-1 opacity-80">
                Фильтр нашёл:{' '}
                {event.moderation.hits.map((h) => `«${h.term}» (${MODERATION_CATEGORY_LABELS[h.category]})`).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 lg:gap-6 items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-5 min-w-0">
          <div className="order-1 lg:order-none bg-card rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-ink bg-brand-tint px-2.5 py-1 rounded-lg border border-brand-line">
                {event.sport.name}
              </span>
              {event.template && event.template.code !== 'free' && (
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {event.template.icon} {event.template.name}
                </span>
              )}
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                {SKILL_LABELS[event.skillLevel]}
              </span>
              {event.byOrganization && (
                <span className="text-xs font-bold text-page bg-ink px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Организация
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">{event.title}</h1>
            <Link
              to={organizerProfileUrl}
              className="mt-3 inline-flex items-center gap-2.5 rounded-lg text-slate-700 transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={`Открыть профиль организатора ${event.organizerName}`}
            >
              <img src={event.organizerAvatar} alt="" className="w-9 h-9 rounded-full object-cover bg-slate-200" />
              <span>
                Организатор: <b className="underline-offset-4 hover:underline">{event.organizerName}</b>
              </span>
            </Link>
            {event.description && (
              <p className="text-base text-slate-700 mt-5 whitespace-pre-line leading-relaxed">{event.description}</p>
            )}

            {event.friendsAttending && event.friendsAttending.length > 0 && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2.5 overflow-hidden" aria-hidden="true">
                    {event.friendsAttending.map((friend) => (
                      <Link
                        key={friend.id}
                        to={`/profiles/users/${friend.id}`}
                        title={friend.fullName}
                        className="relative inline-block w-9 h-9 rounded-full ring-2 ring-white overflow-hidden bg-slate-200 text-slate-800 hover:scale-105 transition-transform"
                      >
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center font-bold text-xs">
                            {friend.fullName.slice(0, 1)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {event.friendsAttending.length === 1
                        ? `Ваш друг ${event.friendsAttending[0].fullName} участвует`
                        : `Ваши друзья (${event.friendsAttending.length}) участвуют: ${event.friendsAttending.map((f) => f.fullName).join(', ')}`}
                    </p>
                    <p className="text-xs text-slate-500">Вы можете пойти вместе!</p>
                  </div>
                </div>
                {canInvite && (
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-card border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-brand" />
                    <span>Позвать ещё</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="order-3 lg:order-none space-y-5 min-w-0">
          <div className="bg-card rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Основное</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Fact icon={<Clock className="w-5 h-5" />} label="Когда">
                {formatDateTime(event.startTime, event.timeZone)} – {formatTime(event.endTime, event.timeZone)}
                {event.recurrenceRule !== 'NONE' && event.recurrenceIntervalDays && <span className="block text-sm font-semibold text-brand-ink">Повторяется через {event.recurrenceIntervalDays} дн.</span>}
                {event.timeZone && isForeignZone(event.timeZone) && (
                  <span className="block text-xs text-slate-500">
                    Местное время{event.cityName ? `: ${event.cityName}` : ''} ({utcLabel(event.timeZone)})
                  </span>
                )}
              </Fact>
              <Fact icon={<MapPin className="w-5 h-5" />} label="Где">
                {event.address}
                <RouteButton lat={event.lat} lng={event.lng} className="mt-2" />
              </Fact>
              <WeatherFact event={event} />
              <Fact icon={<Banknote className="w-5 h-5" />} label="Стоимость">
                {formatPrice(event.price)}
              </Fact>
              <Fact icon={<UserIcon className="w-5 h-5" />} label="Запись">
                {JOIN_MODE_LABELS[event.joinMode]}
              </Fact>
              {ages && (
                <Fact icon={<Users className="w-5 h-5" />} label="Возраст">
                  {ages}
                </Fact>
              )}
              {event.registrationDeadline && (
                <Fact icon={<CalendarPlus className="w-5 h-5" />} label="Приём заявок до">
                  {formatShortDateTime(event.registrationDeadline, event.timeZone)}
                </Fact>
              )}
              {event.requiredEquipment && (
                <div className="sm:col-span-2">
                  <Fact icon={<FileText className="w-5 h-5" />} label="Что взять с собой">
                    {event.requiredEquipment}
                  </Fact>
                </div>
              )}
            </div>
            <div className="mt-5 space-y-2">
              <MiniMap lat={event.lat} lng={event.lng} />
            </div>
          </div>

          {(templateFacts.length > 0 || (event.customFields?.length ?? 0) > 0) && (
            <div className="bg-card rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                {event.template && event.template.code !== 'free' ? event.template.name : 'Детали'}
              </h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {templateFacts.map(({ field, text }) => (
                  <div key={field.key} className={field.type === 'TEXTAREA' ? 'sm:col-span-2' : ''}>
                    <dt className="text-sm text-slate-500 font-semibold">{field.label}</dt>
                    <dd className="text-base text-slate-900 whitespace-pre-line">{text}</dd>
                  </div>
                ))}
                {event.customFields?.map((f, i) => (
                  <div key={`c${i}`}>
                    <dt className="text-sm text-slate-500 font-semibold">{f.label}</dt>
                    <dd className="text-base text-slate-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {org && (
            <div className="bg-card rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-500" /> Сведения организатора
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                {org.contactName && (
                  <Fact icon={<UserIcon className="w-5 h-5" />} label="Контактное лицо">
                    {org.contactName}
                  </Fact>
                )}
                {org.contactPhone && (
                  <Fact icon={<Phone className="w-5 h-5" />} label="Телефон">
                    <a href={`tel:${org.contactPhone.replace(/[^+\d]/g, '')}`} className="text-brand-ink hover:underline">
                      {org.contactPhone}
                    </a>
                  </Fact>
                )}
                {org.contactEmail && (
                  <Fact icon={<Mail className="w-5 h-5" />} label="E-mail">
                    <a href={`mailto:${org.contactEmail}`} className="text-brand-ink hover:underline break-all">
                      {org.contactEmail}
                    </a>
                  </Fact>
                )}
                {org.website && (
                  <Fact icon={<Globe className="w-5 h-5" />} label="Сайт / регламент">
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-brand-ink hover:underline break-all">
                      {org.website}
                    </a>
                  </Fact>
                )}
                {org.venueName && (
                  <Fact icon={<MapPin className="w-5 h-5" />} label="Площадка">
                    {org.venueName}
                  </Fact>
                )}
                {org.prizes && (
                  <Fact icon={<Trophy className="w-5 h-5" />} label="Призы">
                    {org.prizes}
                  </Fact>
                )}
              </div>

              {(org.medicalCertificateRequired || org.insuranceRequired || (org.requiredDocuments?.length ?? 0) > 0) && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Требования к участникам</h3>
                  <div className="flex flex-wrap gap-2">
                    {org.medicalCertificateRequired && <Chip tone="amber">Медицинская справка</Chip>}
                    {org.insuranceRequired && <Chip tone="amber">Страховка</Chip>}
                    {org.requiredDocuments?.map((d) => (
                      <Chip key={d} tone="amber">
                        {d}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {(org.program?.length ?? 0) > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Программа</h3>
                  <ol className="border-l-2 border-brand-line ml-2 space-y-2.5">
                    {org.program!.map((p, i) => (
                      <li key={i} className="pl-4 relative">
                        <span className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-brand border-2 border-white" />
                        {p.time && <span className="font-semibold text-slate-900 mr-2">{p.time}</span>}
                        <span className="text-slate-700">{p.title}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {(org.facilities?.length ?? 0) > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">На площадке</h3>
                  <div className="flex flex-wrap gap-2">
                    {org.facilities!.map((f) => (
                      <Chip key={f} tone="slate">
                        {f}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {org.cancellationPolicy && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Условия отмены</h3>
                  <p className="text-slate-700">{org.cancellationPolicy}</p>
                </div>
              )}
              {org.sponsors && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Партнёры</h3>
                  <p className="text-slate-700">{org.sponsors}</p>
                </div>
              )}
            </div>
          )}
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

            {panel}
            {actionError && <p className="text-sm text-red-700">{actionError}</p>}

            {/* Социальные действия: Позвать друзей и Поделиться */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              {canInvite && (
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <UserPlus className="w-4 h-4 text-brand" />
                  <span>Позвать друзей</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShareOpen(true)}
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

      {joinOpen && (
        <JoinDialog
          event={event}
          waitlist={full}
          onClose={() => setJoinOpen(false)}
          onDone={() => {
            setJoinOpen(false);
            void load();
          }}
        />
      )}
      {cancelOpen && (
        <Modal
          title={my?.status === 'PENDING' ? 'Отозвать заявку?' : my?.status === 'WAITLISTED' ? 'Выйти из очереди?' : 'Отменить участие?'}
          onClose={() => setCancelOpen(false)}
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
            <button onClick={() => setCancelOpen(false)} className="px-5 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
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
      {completeOpen && (
        <Modal title="Завершить событие?" onClose={() => setCompleteOpen(false)}>
          <p className="text-slate-700">Событие будет перенесено в архив организатора и подтверждённых участников.{event.recurrenceRule !== 'NONE' && event.recurrenceIntervalDays ? ` Следующее событие автоматически создастся через ${event.recurrenceIntervalDays} дн.` : ''}</p>
          {actionError && <p className="mt-3 text-sm text-red-700">{actionError}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setCompleteOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold">Отмена</button>
            <button type="button" disabled={busy} onClick={completeEvent} className="rounded-xl bg-ink px-4 py-2.5 font-semibold text-page disabled:opacity-50">{busy ? 'Завершение...' : 'Завершить'}</button>
          </div>
        </Modal>
      )}

      {ticketOpen && my?.ticketCode && (
        <TicketModal
          event={event}
          ticketCode={my.ticketCode}
          participantName={currentUser?.fullName ?? 'Участник'}
          participantAvatar={currentUser?.avatarUrl}
          checkedIn={my.checkedIn}
          checkedInAt={my.checkedInAt}
          onClose={() => setTicketOpen(false)}
        />
      )}

      {scannerOpen && (
        <CheckInScannerModal
          event={event}
          onCheckInSuccess={() => void load()}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {inviteOpen && (
        <InviteFriendsModal
          event={event}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvited={() => void load()}
        />
      )}

      {shareOpen && (
        <ShareEventModal
          event={event}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
};

const Chip: React.FC<{ tone: 'amber' | 'slate'; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={`text-sm px-3 py-1 rounded-full border ${
      tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'
    }`}
  >
    {children}
  </span>
);
