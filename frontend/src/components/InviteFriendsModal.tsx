import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Loader2, Send, Users } from 'lucide-react';
import { eventsApi, friendsApi } from '../api';
import { errorMessage } from '../api/client';
import type { Friend, SportEvent } from '../types';
import { Modal } from './Modal';

interface InviteFriendsModalProps {
  event: SportEvent;
  open: boolean;
  onClose: () => void;
  onInvited?: (count: number) => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  event,
  open,
  onClose,
  onInvited,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setMessage('');
      setSentCount(null);
      setError(null);
      return;
    }
    setLoading(true);
    friendsApi
      .list()
      .then((list) => {
        setFriends(list);
        setError(null);
      })
      .catch((e) => setError(errorMessage(e, 'Не удалось загрузить список друзей')))
      .finally(() => setLoading(false));
  }, [open]);

  const attendingIds = new Set(event.friendsAttending?.map((f) => f.id) ?? []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await eventsApi.inviteFriends(event.id, {
        friendIds: selectedIds,
        message: message.trim() || undefined,
      });
      setSentCount(res.invitedCount);
      if (onInvited) onInvited(res.invitedCount);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось отправить приглашения'));
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      title="Позвать друзей на мероприятие"
    >
      {sentCount !== null ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h3 className="text-xl font-bold text-ink">Приглашения отправлены!</h3>
          <p className="text-sm text-muted">
            {sentCount === 1
              ? 'Друг получит уведомление в приложении.'
              : `${sentCount} друзей получили приглашения в приложении.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Выберите друзей, которых хотите пригласить на <b>«{event.title}»</b>. Они сразу получат уведомление с ссылкой на событие.
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex justify-center text-muted">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-2xl bg-surface border border-line-2">
              <Users className="w-10 h-10 mx-auto mb-2 text-muted opacity-40" />
              <p className="text-sm font-semibold text-ink">У вас пока нет друзей в Sportikus</p>
              <p className="text-xs text-muted mt-1">
                Вы можете найти друзей в своём профиле по email или поделиться прямой ссылкой на событие!
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto divide-y divide-line-2 border border-line-2 rounded-2xl">
                {friends.map((friend) => {
                  const isAttending = attendingIds.has(friend.userId);
                  const isSelected = selectedIds.includes(friend.userId);
                  return (
                    <div
                      key={friend.userId}
                      onClick={() => !isAttending && toggleSelect(friend.userId)}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isAttending
                          ? 'opacity-60 bg-surface cursor-not-allowed'
                          : 'cursor-pointer hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-full overflow-hidden bg-surface-2 text-ink flex items-center justify-center font-bold text-sm shrink-0 border border-line-2">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            friend.fullName.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink truncate">{friend.fullName}</p>
                          {isAttending && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Уже участвует
                            </span>
                          )}
                        </div>
                      </div>

                      {!isAttending && (
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-brand border-brand text-on-brand'
                              : 'border-line-2 bg-card text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {friends.some((f) => !attendingIds.has(f.userId)) && (
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                    Сообщение к приглашению (необязательно)
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Привет! Собираем состав, пойдём с нами?"
                    className="w-full rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-ink transition-colors"
                  />
                </div>
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
            {friends.some((f) => !attendingIds.has(f.userId)) && (
              <button
                type="button"
                disabled={selectedIds.length === 0 || sending}
                onClick={handleSend}
                className="px-5 py-2.5 rounded-xl bg-brand text-on-brand text-sm font-bold hover:bg-brand-hover disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  Отправить {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
