import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserRound } from 'lucide-react';
import { friendsApi, profilesApi, subscriptionsApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { FriendSearchResult } from '../../types';
import { Button, ErrorNotice, inputClass } from '../../components/ui';
import { changeFriendship, type FriendshipAction } from './friendship';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const outline = 'rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50';

const Avatar: React.FC<{ url?: string; size: string }> = ({ url, size }) => (
  <div className={`${size} shrink-0 overflow-hidden rounded-full bg-slate-200 flex items-center justify-center`}>
    {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <UserRound className="h-1/2 w-1/2 text-slate-500" />}
  </div>
);

/** Вкладка «Друзья» своего профиля: поиск по почте, входящие заявки и список друзей. */
export const FriendsTab: React.FC = () => {
  const friends = useApi(() => friendsApi.list(), []);
  const requests = useApi(() => friendsApi.incoming(), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FriendSearchResult>();
  const [searchError, setSearchError] = useState('');
  // Для найденной организации: подписан ли текущий пользователь
  const [orgSubscribed, setOrgSubscribed] = useState(false);

  const friendList = friends.data ?? [];
  const requestList = requests.data ?? [];

  const act = async (action: FriendshipAction, userId: number) => {
    setBusy(true);
    setActionError(null);
    try {
      const state = await changeFriendship(action, userId);
      requests.mutate((items) => items?.filter((r) => r.userId !== userId));
      if (action === 'remove') friends.mutate((items) => items?.filter((f) => f.userId !== userId));
      if (action === 'accept') friends.reload();
      if (found?.userId === userId) setFound({ ...found, state });
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = email.trim();
    if (!query) return;
    setSearching(true);
    setFound(undefined);
    setSearchError('');
    try {
      const result = await friendsApi.search(query);
      setOrgSubscribed(result.organizationId ? Boolean((await profilesApi.organization(result.organizationId)).subscribed) : false);
      setFound(result);
    } catch (err) {
      setSearchError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const toggleOrgSubscription = async () => {
    const orgId = found?.organizationId;
    if (!orgId) return;
    setBusy(true);
    setActionError(null);
    try {
      if (orgSubscribed) await subscriptionsApi.unsubscribe(orgId);
      else await subscriptionsApi.subscribe(orgId);
      setOrgSubscribed(!orgSubscribed);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-bold">Друзья</h2>
        {friends.data && <span className="text-sm text-slate-500">{friendList.length}</span>}
      </div>
      {actionError && <ErrorNotice message={actionError} className="mt-4" />}

      <div className={`mt-5 ${card}`}>
        <h3 className="text-lg font-bold">Найти человека или организацию</h3>
        <form onSubmit={search} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="friend-email" className="sr-only">
            Электронная почта пользователя или организации
          </label>
          <input
            id="friend-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Почта пользователя или организации"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <Button type="submit" loading={searching} className="shrink-0">
            {!searching && <Search className="h-4 w-4" />}
            {searching ? 'Ищем…' : 'Найти'}
          </Button>
        </form>
        {searchError && <p className="mt-3 text-sm text-red-700">{searchError}</p>}
        {found && (
          <article className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-slate-50 p-4">
            <Avatar url={found.avatarUrl} size="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <Link
                to={found.organizationId ? `/profiles/organizations/${found.organizationId}` : `/profiles/users/${found.userId}`}
                className="font-semibold text-slate-900 hover:text-brand break-words"
              >
                {found.fullName}
              </Link>
              <p className="truncate text-sm text-slate-500">{found.email}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              {found.organizationId && (
                <Button
                  size="sm"
                  variant={orgSubscribed ? 'secondary' : 'primary'}
                  disabled={busy}
                  onClick={toggleOrgSubscription}
                  className="w-full sm:w-auto"
                >
                  {orgSubscribed ? 'Отписаться' : 'Подписаться'}
                </Button>
              )}
              {!found.organizationId && found.state === 'NONE' && (
                <Button size="sm" disabled={busy} onClick={() => act('request', found.userId)} className="w-full sm:w-auto">
                  Добавить в друзья
                </Button>
              )}
              {found.state === 'OUTGOING_PENDING' && (
                <button type="button" disabled={busy} onClick={() => act('remove', found.userId)} className={`w-full sm:w-auto ${outline}`}>
                  Заявка отправлена · Отменить
                </button>
              )}
              {found.state === 'INCOMING_PENDING' && <RequestButtons busy={busy} onAnswer={(a) => act(a, found.userId)} />}
              {found.state === 'FRIENDS' && (
                <span className="rounded-full bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand-ink">Уже в друзьях</span>
              )}
            </div>
          </article>
        )}
      </div>

      {requestList.length > 0 && (
        <div className={`mt-5 ${card}`}>
          <h3 className="text-lg font-bold">Входящие заявки</h3>
          <div className="mt-4 space-y-3">
            {requestList.map((request) => (
              <div key={request.userId} className="flex flex-wrap items-center gap-3">
                <Avatar url={request.avatarUrl} size="h-10 w-10" />
                <span className="mr-auto font-medium min-w-0 break-words">{request.fullName}</span>
                <RequestButtons busy={busy} onAnswer={(a) => act(a, request.userId)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {friends.loading && <p className="mt-5 text-slate-500">Загружаем друзей...</p>}
      {friends.error && <ErrorNotice message={friends.error} onRetry={friends.reload} className="mt-5" />}
      {friends.data &&
        (friendList.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {friendList.map((friend) => (
              <article key={friend.userId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <Avatar url={friend.avatarUrl} size="h-12 w-12" />
                <Link to={`/profiles/users/${friend.userId}`} className="min-w-0 flex-1 truncate font-semibold text-slate-900 hover:text-brand">
                  {friend.fullName}
                </Link>
                <button type="button" disabled={busy} onClick={() => act('remove', friend.userId)} className={outline}>
                  Удалить
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-slate-500">Пока нет подтверждённых друзей. Откройте профиль спортсмена, чтобы отправить заявку.</p>
        ))}
    </section>
  );
};

const RequestButtons: React.FC<{ busy: boolean; onAnswer: (action: 'accept' | 'reject') => void }> = ({ busy, onAnswer }) => (
  <div className="flex gap-2 w-full sm:w-auto shrink-0">
    <Button size="sm" disabled={busy} onClick={() => onAnswer('accept')} className="flex-1 sm:flex-initial">
      Принять
    </Button>
    <button type="button" disabled={busy} onClick={() => onAnswer('reject')} className={`flex-1 sm:flex-initial ${outline}`}>
      Отклонить
    </button>
  </div>
);
