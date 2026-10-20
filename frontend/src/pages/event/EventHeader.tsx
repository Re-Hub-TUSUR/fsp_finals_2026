import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldAlert, UserPlus } from 'lucide-react';
import type { SportEvent } from '../../types';
import { SKILL_LABELS } from '../../utils/format';
import { ATTENTION_SYMBOL, MODERATION_CATEGORY_LABELS, autoRejectReason, isAutoRejected, needsAdminAttention } from '../../utils/moderation';
import type { EventPhase } from './eventPhase';

/** Предупреждения над страницей: снято с публикации / на проверке и (для администратора) сигнал автопроверки. */
export const EventStatusBanners: React.FC<{ event: SportEvent; phase: EventPhase }> = ({ event, phase }) => (
  <>
    {phase.unpublished && (
      <div
        className={`mb-5 p-4 rounded-xl border flex gap-3 ${
          phase.onReview ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}
      >
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <div>
          <b>
            {phase.onReview
              ? 'Мероприятие проходит автоматическую проверку.'
              : isAutoRejected(event)
                ? 'Мероприятие не прошло автоматическую проверку.'
                : 'Мероприятие снято с публикации администратором.'}
          </b>
          {!phase.onReview && (
            <p className="text-sm mt-0.5">Причина: {autoRejectReason(event.unpublishReason) || 'Нарушение правил площадки'}</p>
          )}
        </div>
      </div>
    )}

    {/* Только для администратора: сомнительное мероприятие, которое пропустил ИИ */}
    {event.moderation && needsAdminAttention(event) && (
      <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex gap-3">
        <span className="text-xl leading-none shrink-0" aria-hidden="true">
          {ATTENTION_SYMBOL}
        </span>
        <div className="text-sm">
          <b className="text-base">Автопроверка: требует внимания</b>
          {event.moderation.reason && <p className="mt-0.5">{event.moderation.reason}</p>}
          {event.moderation.hits.length > 0 && (
            <p className="mt-1 opacity-80">
              Фильтр нашёл: {event.moderation.hits.map((h) => `«${h.term}» (${MODERATION_CATEGORY_LABELS[h.category]})`).join(', ')}
            </p>
          )}
        </div>
      </div>
    )}
  </>
);

const tag = 'text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg';

/** Карточка-шапка: теги, название, организатор, описание и друзья, которые идут. */
export const EventHeaderCard: React.FC<{ event: SportEvent; onInvite?: () => void }> = ({ event, onInvite }) => {
  const organizerProfileUrl = event.byOrganization
    ? `/profiles/organizations/${event.organizationId}`
    : `/profiles/users/${event.organizerUserId}`;
  const friends = event.friendsAttending ?? [];

  return (
    <div className="bg-card rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-ink bg-brand-tint px-2.5 py-1 rounded-lg border border-brand-line">
          {event.sport.name}
        </span>
        {event.template && event.template.code !== 'free' && (
          <span className={tag}>
            {event.template.icon} {event.template.name}
          </span>
        )}
        <span className={tag}>{SKILL_LABELS[event.skillLevel]}</span>
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
        <img src={event.organizerAvatar} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover bg-slate-200" />
        <span>
          Организатор: <b className="underline-offset-4 hover:underline">{event.organizerName}</b>
        </span>
      </Link>
      {event.description && <p className="text-base text-slate-700 mt-5 whitespace-pre-line leading-relaxed">{event.description}</p>}

      {friends.length > 0 && (
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5 overflow-hidden" aria-hidden="true">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  to={`/profiles/users/${friend.id}`}
                  title={friend.fullName}
                  className="relative inline-block w-9 h-9 rounded-full ring-2 ring-white overflow-hidden bg-slate-200 text-slate-800 hover:scale-105 transition-transform"
                >
                  {friend.avatarUrl ? (
                    <img src={friend.avatarUrl} alt="" loading="lazy" width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center font-bold text-xs">{friend.fullName.slice(0, 1)}</span>
                  )}
                </Link>
              ))}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {friends.length === 1
                  ? `Ваш друг ${friends[0].fullName} участвует`
                  : `Ваши друзья (${friends.length}) участвуют: ${friends.map((f) => f.fullName).join(', ')}`}
              </p>
              <p className="text-xs text-slate-500">Вы можете пойти вместе!</p>
            </div>
          </div>
          {onInvite && (
            <button
              type="button"
              onClick={onInvite}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-card border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-brand" />
              <span>Позвать ещё</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
