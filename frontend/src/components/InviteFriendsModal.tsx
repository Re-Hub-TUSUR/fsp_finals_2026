import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Send, Users } from 'lucide-react';
import { eventsApi } from '../api';
import { errorMessage } from '../api/client';
import type { InviteFriend, InviteFriendsResult, SportEvent } from '../types';
import { plural } from '../utils/eventView';
import { Modal } from './Modal';
import { Button, LoadingBlock } from './ui';

interface InviteFriendsModalProps {
  event: SportEvent;
  open: boolean;
  onClose: () => void;
  onInvited?: (count: number) => void;
}

const MESSAGE_MAX = 300;

const STATE_LABEL: Record<Exclude<InviteFriend['state'], 'AVAILABLE'>, string> = {
  INVITED: 'Уже приглашён',
  PARTICIPATING: 'Уже идёт',
};

/** Пригласить друзей: каждый выбранный получит уведомление со ссылкой на мероприятие. */
export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ event, open, onClose, onInvited }) => {
  const [friends, setFriends] = useState<InviteFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<InviteFriendsResult | null>(null);

  // Окно монтируется заново при каждом открытии, поэтому начальное состояние всегда чистое
  useEffect(() => {
    if (!open) return;
    eventsApi
      .inviteCandidates(event.id)
      .then(setFriends)
      .catch((e) => setError(errorMessage(e, 'Не удалось загрузить список друзей')))
      .finally(() => setLoading(false));
  }, [open, event.id]);

  const available = friends.filter((f) => f.state === 'AVAILABLE');

  const toggle = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const send = async () => {
    if (selectedIds.length === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await eventsApi.inviteFriends(event.id, {
        friendIds: selectedIds,
        message: message.trim() || undefined,
      });
      setResult(res);
      // Отмечаем в списке, чтобы при повторном открытии без перезагрузки никого не позвать дважды
      setFriends((list) =>
        list.map((f) =>
          res.invitedUserIds.includes(f.userId) || res.alreadyInvitedIds.includes(f.userId)
            ? { ...f, state: 'INVITED' }
            : res.alreadyParticipatingIds.includes(f.userId)
              ? { ...f, state: 'PARTICIPATING' }
              : f,
        ),
      );
      onInvited?.(res.invitedCount);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось отправить приглашения'));
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  if (result) {
    const skipped = result.alreadyInvitedIds.length + result.alreadyParticipatingIds.length;
    return (
      <Modal onClose={onClose} title="Позвать друзей на мероприятие">
        <div className="py-6 text-center space-y-3" role="status">
          <div className="w-14 h-14 rounded-full bg-brand-tint text-brand-ink mx-auto flex items-center justify-center">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h3 className="text-xl font-bold text-ink">
            {result.invitedCount > 0 ? 'Приглашения отправлены' : 'Никого нового не позвали'}
          </h3>
          {result.invitedCount > 0 && (
            <p className="text-sm text-muted">
              {result.invitedCount} {plural(result.invitedCount, 'друг получит', 'друга получат', 'друзей получат')} уведомление
              со ссылкой на «{event.title}».
            </p>
          )}
          {skipped > 0 && (
            <p className="text-xs text-muted">
              {result.alreadyInvitedIds.length > 0 && `Уже приглашены раньше: ${result.alreadyInvitedIds.length}. `}
              {result.alreadyParticipatingIds.length > 0 && `Уже идут: ${result.alreadyParticipatingIds.length}.`}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-2 px-6 py-2.5 rounded-xl bg-brand text-on-brand text-sm font-bold hover:bg-brand-hover transition-colors"
          >
            Готово
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Позвать друзей на мероприятие">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Выберите друзей, которых хотите пригласить на <b className="text-ink">«{event.title}»</b>. Они получат уведомление
          со ссылкой на событие.
        </p>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingBlock className="py-12" label="Загружаем друзей" />
        ) : friends.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-surface border border-line-2">
            <Users className="w-10 h-10 mx-auto mb-2 text-muted opacity-40" />
            <p className="text-sm font-semibold text-ink">У вас пока нет друзей в Sportikus</p>
            <p className="text-xs text-muted mt-1">
              Найдите друзей по e-mail во вкладке «Друзья» профиля или поделитесь ссылкой на событие.
            </p>
          </div>
        ) : (
          <>
            <ul className="max-h-64 overflow-y-auto divide-y divide-line-2 border border-line-2 rounded-2xl" aria-label="Друзья">
              {friends.map((friend) => {
                const selectable = friend.state === 'AVAILABLE';
                const selected = selectedIds.includes(friend.userId);
                return (
                  <li key={friend.userId}>
                    <button
                      type="button"
                      disabled={!selectable}
                      aria-pressed={selectable ? selected : undefined}
                      onClick={() => toggle(friend.userId)}
                      className={`w-full p-3 flex items-center justify-between gap-3 text-left transition-colors ${
                        selectable ? 'hover:bg-surface' : 'bg-surface cursor-default'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-full overflow-hidden bg-surface-2 text-ink flex items-center justify-center font-bold text-sm shrink-0 border border-line-2">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            friend.fullName.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-bold truncate ${selectable ? 'text-ink' : 'text-muted'}`}>
                            {friend.fullName}
                          </span>
                          {!selectable && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {STATE_LABEL[friend.state as 'INVITED' | 'PARTICIPATING']}
                            </span>
                          )}
                        </span>
                      </span>
                      {selectable && (
                        <span
                          aria-hidden="true"
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                            selected ? 'bg-brand border-brand text-on-brand' : 'border-line-2 bg-card text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {available.length > 0 ? (
              <div>
                <label htmlFor="invite-message" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  Сообщение к приглашению (необязательно)
                </label>
                <input
                  id="invite-message"
                  type="text"
                  value={message}
                  maxLength={MESSAGE_MAX}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Привет! Собираем состав, пойдём с нами?"
                  className="w-full rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-ink transition-colors"
                />
              </div>
            ) : (
              <p className="text-sm text-muted">Все ваши друзья уже приглашены или идут на это мероприятие.</p>
            )}
          </>
        )}

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-line-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-line-2 text-sm font-bold text-ink hover:bg-surface transition-colors"
          >
            Отмена
          </button>
          {available.length > 0 && (
            <Button disabled={selectedIds.length === 0} loading={sending} onClick={() => void send()} className="font-bold">
              {!sending && <Send className="w-4 h-4" />}
              <span>Пригласить{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
