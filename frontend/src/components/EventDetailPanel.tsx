import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Loader2, MapPin, X } from 'lucide-react';
import type { SportEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { SKILL_LABELS, registrationClosesAt } from '../utils/format';
import {
  accessLabel,
  dateFull,
  distanceKm,
  eventStatus,
  formatDistance,
  isFull,
  isLive,
  startLabelLong,
  timeRange,
  travelLabel,
  type LatLng,
} from '../utils/eventView';
import { CoverBadge, EventCover, OrgAvatar, SeatMeter, SportIcon } from './EventBits';
import { useEventJoin } from './useEventJoin';
import { RouteButton } from './RouteButton';
import { useEventWeather } from './EventWeather';

interface EventDetailPanelProps {
  event: SportEvent;
  me: LatLng | null;
  onClose: () => void;
  /** После записи — перечитать список, чтобы обновились статусы и метки */
  onChanged: () => void;
}

const Row: React.FC<{ icon: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode }> = ({ icon, title, sub }) => (
  <div className="flex gap-3 items-center">
    <span className="shrink-0 w-10 h-10 rounded-xl bg-surface text-ink flex items-center justify-center">{icon}</span>
    <div className="min-w-0">
      <div className="text-base font-semibold text-ink leading-snug">{title}</div>
      {sub && <div className="text-[13px] font-medium text-muted">{sub}</div>}
    </div>
  </div>
);

/**
 * Подробности события на главной (Sportikus Home): справа панелью на десктопе, снизу шитом на мобильном.
 * Полная страница события (чат, анкета организатора, управление) — по ссылке «Открыть страницу».
 */
export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({ event, me, onClose, onChanged }) => {
  const { currentUser, preferences } = useAuth();
  const join = useEventJoin(event, onChanged);
  const loadingJoin = join.busy;
  const error = join.error;

  const weather = useEventWeather(event);
  const status = eventStatus(event);
  const km = me ? distanceKm(me, event) : null;
  const my = event.myParticipation && event.myParticipation.status !== 'CANCELLED' ? event.myParticipation : null;
  const closed = registrationClosesAt(event).getTime() < Date.now();
  const sameLevel = !!preferences?.skillLevel && (event.skillLevel === preferences.skillLevel || event.skillLevel === 'ANY');
  const levelLine =
    (event.skillLevel === 'ANY' ? 'Любой уровень' : `${SKILL_LABELS[event.skillLevel]} уровень`) + (sameLevel ? ' · как у вас' : '');
  const organizerUrl = event.byOrganization
    ? `/profiles/organizations/${event.organizationId}`
    : event.organizerUserId
      ? `/profiles/users/${event.organizerUserId}`
      : null;

  const primaryClass = 'flex-[1.4] h-14 rounded-[18px] text-[17px] font-bold flex items-center justify-center gap-2 transition-colors';
  const primary = event.canManage ? (
    <Link to={`/events/${event.id}/manage`} className={`${primaryClass} bg-brand text-on-brand hover:bg-brand-hover`}>
      Управлять
    </Link>
  ) : currentUser && currentUser.role !== 'ROLE_USER' ? (
    // Записываться могут только пользователи (организация и администратор — нет)
    <span className={`${primaryClass} bg-surface-2 text-muted`}>Только для пользователей</span>
  ) : my?.status === 'WAITLISTED' ? (
    isFull(event) ? (
      <span className={`${primaryClass} bg-surface-2 text-ink`}>Вы в очереди</span>
    ) : (
      <button
        type="button"
        onClick={() => void join.start()}
        disabled={loadingJoin}
        className={`${primaryClass} bg-brand text-on-brand hover:bg-brand-hover disabled:opacity-70`}
      >
        {loadingJoin && <Loader2 className="w-5 h-5 animate-spin" />}
        Занять место
      </button>
    )
  ) : my ? (
    <span className={`${primaryClass} bg-brand-tint text-brand-ink`}>
      {my.status === 'CONFIRMED' ? 'Вы записаны ✓' : my.status === 'PENDING' ? 'Заявка отправлена' : 'Заявка отклонена'}
    </span>
  ) : !currentUser ? (
    <Link to="/auth" className={`${primaryClass} bg-brand text-on-brand hover:bg-brand-hover`}>
      Войти и записаться
    </Link>
  ) : closed ? (
    <span className={`${primaryClass} bg-surface-2 text-muted`}>Запись закрыта</span>
  ) : (
    <button
      type="button"
      onClick={() => void join.start()}
      disabled={loadingJoin}
      className={`${primaryClass} bg-brand text-on-brand hover:bg-brand-hover disabled:opacity-70`}
    >
      {loadingJoin && <Loader2 className="w-5 h-5 animate-spin" />}
      {isFull(event) ? 'Встать в очередь' : event.joinMode === 'APPROVAL' ? 'Подать заявку' : 'Записаться'}
    </button>
  );

  return (
    <>
      <div
        role="dialog"
        aria-label={event.title}
        className="flex flex-col bg-card overflow-hidden shadow-[0_-12px_32px_rgba(6,12,30,0.28)] lg:shadow-[-12px_0_32px_rgba(6,12,30,0.16)]"
      >
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="lg:hidden w-10 h-[5px] rounded-full bg-surface-2 mx-auto mt-2.5 mb-1" />
          <div className="px-4 pt-2 lg:pt-4">
            <div className="rounded-[20px] overflow-hidden">
              <EventCover event={event} height={180}>
                <div className="absolute top-3.5 left-3.5 flex gap-1.5">
                  <CoverBadge>
                    <SportIcon name={event.sport.name} size={16} />
                    {event.sport.name}
                  </CoverBadge>
                  <CoverBadge>{accessLabel(event)}</CoverBadge>
                </div>
              </EventCover>
            </div>
          </div>

          <div className="px-5 pt-4 pb-5 flex flex-col gap-[18px]">
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-11 h-11 rounded-[14px] bg-surface text-ink flex items-center justify-center">
                <SportIcon name={event.sport.name} size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-base font-semibold ${sameLevel ? 'text-brand-ink' : 'text-ink'}`}>{levelLine}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="shrink-0 w-10 h-10 rounded-[14px] bg-surface text-ink flex items-center justify-center hover:bg-surface-2"
              >
                <X className="w-4 h-4" strokeWidth={2.4} />
              </button>
            </div>

            <div className="flex flex-col gap-2 items-start">
              {status.special && (
                <span className={`text-[13px] font-semibold px-2.5 py-1.5 rounded-[10px] ${status.chip}`}>{status.label}</span>
              )}
              <h2 className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.025em] text-ink">{event.title}</h2>
            </div>

            <div className="flex flex-col gap-3.5">
              <Row
                icon={<Clock className="w-5 h-5" />}
                title={isLive(event) ? dateFull(event) : `${startLabelLong(event).split(',')[0]}, ${timeRange(event)}`}
                sub={new Date(event.startTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
              />
              <Row
                icon={<MapPin className="w-5 h-5" />}
                title={event.address}
                sub={
                  <>
                    {km != null && <div>{`${formatDistance(km)} · ${travelLabel(km)}`}</div>}
                    <RouteButton lat={event.lat} lng={event.lng} className="mt-1.5" />
                  </>
                }
              />
              {weather && (
                <Row
                  icon={<weather.Icon className="w-5 h-5" />}
                  title={weather.title}
                  sub={`Погода в это время · ${weather.details}`}
                />
              )}
            </div>

            <div className="p-4 rounded-[18px] border border-line">
              <SeatMeter event={event} />
            </div>

            {organizerUrl ? (
              <Link to={organizerUrl} className="flex items-center gap-3 p-3 rounded-[18px] bg-surface hover:bg-surface-2 transition-colors">
                <OrgAvatar event={event} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-ink truncate">{event.organizerName}</div>
                  <div className="text-[13px] font-medium text-muted">Организатор</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted" />
              </Link>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-[18px] bg-surface">
                <OrgAvatar event={event} size={44} />
                <div className="text-base font-semibold text-ink">{event.organizerName}</div>
              </div>
            )}

            {event.description && <p className="text-[15px] leading-relaxed text-ink whitespace-pre-line">{event.description}</p>}
            {error && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 flex gap-2.5 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-line bg-card">
          <Link
            to={`/events/${event.id}`}
            className="flex-1 h-14 rounded-[18px] bg-surface text-ink text-base font-semibold flex items-center justify-center hover:bg-surface-2"
          >
            Открыть страницу
          </Link>
          {primary}
        </div>
      </div>

      {join.dialog}
    </>
  );
};
