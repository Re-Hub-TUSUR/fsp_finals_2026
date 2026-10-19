import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Building2, Edit3, Mail, Save, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { achievementsApi, friendsApi, profilesApi, subscriptionsApi } from '../api';
import { errorMessage } from '../api/client';
import { EventCard } from '../components/EventCard';
import { InterestsPanel } from '../components/InterestsPanel';
import { useAuth } from '../context/AuthContext';
import type { Achievement, Friend, FriendRequest, FriendSearchResult, FriendshipState, OrganizationSubscription, Profile } from '../types';

export function OwnProfilePage() {
  const { currentUser, ready } = useAuth();
  if (!ready) return null;
  if (!currentUser) return <Navigate to="/auth" replace />;
  return <ProfilePage forcedType={currentUser.organizationId ? 'organizations' : 'users'} forcedId={currentUser.organizationId ?? currentUser.id} />;
}

export function ProfilePage({ forcedType, forcedId }: { forcedType?: 'users' | 'organizations'; forcedId?: number }) {
  const params = useParams();
  const type = forcedType ?? (params.type as 'users' | 'organizations');
  const id = forcedId ?? Number(params.id);
  const { currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile>();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '' });
  const [imageFile, setImageFile] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendBusy, setFriendBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'friends' | 'subscriptions' | 'achievements'>('profile');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendSearch, setFriendSearch] = useState<FriendSearchResult>();
  const [friendSearchMessage, setFriendSearchMessage] = useState('');
  const [friendSearching, setFriendSearching] = useState(false);
  const [subscriptions, setSubscriptions] = useState<OrganizationSubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const ownUserProfile = type === 'users' && currentUser?.id === id;

  useEffect(() => {
    setError(''); setProfile(undefined); setActiveTab('profile'); setFriends([]); setFriendsLoaded(false);
    const request = type === 'organizations' ? profilesApi.organization(id) : profilesApi.user(id);
    request.then((data) => { setProfile(data); setForm({ name: data.name, description: data.description ?? '', imageUrl: data.imageUrl ?? '' }); }).catch((e) => setError(errorMessage(e)));
  }, [currentUser?.id, id, type]);

  useEffect(() => {
    if (ownUserProfile) {
      friendsApi.incoming().then(setFriendRequests).catch(() => setFriendRequests([]));
    } else setFriendRequests([]);
  }, [ownUserProfile]);

  useEffect(() => {
    if (!ownUserProfile || activeTab !== 'friends' || friendsLoaded) return;
    let cancelled = false;
    setFriendsLoading(true);
    friendsApi.list()
      .then((items) => { if (!cancelled) { setFriends(items); setFriendsLoaded(true); } })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setFriendsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, friendsLoaded, ownUserProfile]);

  useEffect(() => {
    if (type !== 'users' || activeTab !== 'achievements') return;
    achievementsApi.profile(id).then(setAchievements).catch((err) => setError(errorMessage(err)));
  }, [activeTab, id, type]);

  useEffect(() => {
    if (!ownUserProfile || activeTab !== 'subscriptions') return;
    setSubscriptionsLoading(true);
    subscriptionsApi.list().then(setSubscriptions).catch((err) => setError(errorMessage(err))).finally(() => setSubscriptionsLoading(false));
  }, [activeTab, ownUserProfile]);

  const toggleSubscription = async () => {
    if (!profile || profile.type !== 'ORGANIZATION') return;
    setSubscriptionBusy(true); setError('');
    try {
      if (profile.subscribed) await subscriptionsApi.unsubscribe(profile.id);
      else await subscriptionsApi.subscribe(profile.id);
      setProfile({
        ...profile,
        subscribed: !profile.subscribed,
        subscriberCount: Math.max(0, (profile.subscriberCount ?? 0) + (profile.subscribed ? -1 : 1)),
      });
    } catch (err) { setError(errorMessage(err)); }
    finally { setSubscriptionBusy(false); }
  };

  const setFriendship = async (action: 'request' | 'remove' | 'accept' | 'reject', userId: number) => {
    setFriendBusy(true); setError('');
    try {
      if (action === 'request') await friendsApi.request(userId);
      if (action === 'remove') await friendsApi.remove(userId);
      if (action === 'accept') await friendsApi.accept(userId);
      if (action === 'reject') await friendsApi.reject(userId);
      if (profile && userId === profile.id) {
        const state: FriendshipState = action === 'request' ? 'OUTGOING_PENDING' : action === 'accept' ? 'FRIENDS' : 'NONE';
        setProfile({ ...profile, friendshipState: state });
      }
      setFriendRequests((items) => items.filter((request) => request.userId !== userId));
      if (action === 'remove') setFriends((items) => items.filter((friend) => friend.userId !== userId));
      if (action === 'accept') setFriendsLoaded(false);
      if (friendSearch?.userId === userId) {
        const state: FriendshipState = action === 'request' ? 'OUTGOING_PENDING' : action === 'accept' ? 'FRIENDS' : 'NONE';
        setFriendSearch({ ...friendSearch, state });
      }
    } catch (err) { setError(errorMessage(err)); }
    finally { setFriendBusy(false); }
  };

  const searchFriend = async (e: FormEvent) => {
    e.preventDefault();
    const email = friendEmail.trim();
    if (!email) return;
    setFriendSearching(true); setFriendSearch(undefined); setFriendSearchMessage('');
    try { setFriendSearch(await friendsApi.search(email)); }
    catch (err) { setFriendSearchMessage(errorMessage(err)); }
    finally { setFriendSearching(false); }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let data = type === 'organizations' ? await profilesApi.updateOrganization(id, form) : await profilesApi.updateUser(id, form);
      if (imageFile) data = type === 'organizations' ? await profilesApi.uploadOrganizationImage(id, imageFile) : await profilesApi.uploadUserImage(id, imageFile);
      setProfile(data); setEditing(false); await refreshUser();
      setImageFile(undefined);
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };
  if (error && !profile) return <p className="mx-auto max-w-5xl p-8 text-red-700">{error}</p>;
  if (!profile) return <p className="p-8 text-center text-slate-500">Загрузка профиля...</p>;
  const isOrg = profile.type === 'ORGANIZATION';
  const friendshipAction = !isOrg && !profile.canEdit ? profile.friendshipState ?? 'NONE' : null;
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <section className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-start">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-200">
        {profile.imageUrl ? <img src={profile.imageUrl} alt="" className="h-full w-full object-cover" /> : isOrg ? <Building2 className="h-10 w-10 text-slate-500" /> : <UserRound className="h-10 w-10 text-slate-500" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-emerald-700">{isOrg ? 'Организация' : 'Пользователь'}</p><h1 className="text-3xl font-bold text-slate-900">{profile.name}</h1></div>
          {profile.canEdit && <button onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"><Edit3 className="h-4 w-4" />Редактировать профиль</button>}
          {isOrg && currentUser?.role === 'ROLE_USER' && !profile.canEdit && <button disabled={subscriptionBusy} onClick={toggleSubscription} className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${profile.subscribed ? 'border border-slate-300' : 'bg-brand text-on-brand'}`}>{profile.subscribed ? 'Отписаться' : 'Подписаться'}</button>}
          {friendshipAction === 'NONE' && <button disabled={friendBusy} onClick={() => setFriendship('request', profile.id)} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50">Добавить в друзья</button>}
          {friendshipAction === 'OUTGOING_PENDING' && <button disabled={friendBusy} onClick={() => setFriendship('remove', profile.id)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Заявка отправлена · Отменить</button>}
          {friendshipAction === 'INCOMING_PENDING' && <div className="flex gap-2"><button disabled={friendBusy} onClick={() => setFriendship('accept', profile.id)} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50">Принять заявку</button><button disabled={friendBusy} onClick={() => setFriendship('reject', profile.id)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Отклонить</button></div>}
          {friendshipAction === 'FRIENDS' && <button disabled={friendBusy} onClick={() => setFriendship('remove', profile.id)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Удалить из друзей</button>}
        </div>
        <p className="mt-3 flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4" />{profile.email}</p>
        {profile.description && <p className="mt-4 max-w-3xl text-slate-700">{profile.description}</p>}
        {isOrg && <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600"><span>ИНН: {profile.inn ?? 'не указан'}</span><span>ОГРН: {profile.ogrn ?? 'не указан'}</span><span>КПП: {profile.kpp ?? 'не указан'}</span></div>}
        {isOrg && <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" />Статус: {profile.status === 'APPROVED' ? 'одобрена' : profile.status === 'REJECTED' ? 'отклонена' : 'на рассмотрении'}</p>}
        {isOrg && <p className="mt-2 text-sm font-semibold text-slate-600">Подписчиков: {profile.subscriberCount ?? 0}</p>}
      </div>
    </section>
    {editing && <form onSubmit={save} className="my-6 space-y-4 border-b border-slate-200 pb-6">
      <label className="block text-sm font-medium">Имя / название<input value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-md border px-3 py-2" required /></label>
      {isOrg && <label className="block text-sm font-medium">Описание<textarea value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-md border px-3 py-2" rows={4} /></label>}
      <label className="block text-sm font-medium">Фото профиля<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files?.[0])} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:font-semibold file:text-on-brand" /><span className="mt-1 block text-xs text-slate-500">JPG, PNG или WebP, не более 5 МБ</span></label>
      <div className="flex gap-3"><button disabled={saving} className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-on-brand disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Сохранение...' : 'Сохранить'}</button><button type="button" onClick={() => { setEditing(false); setImageFile(undefined); }} className="flex items-center gap-2 rounded-md border px-4 py-2"><X className="h-4 w-4" />Отмена</button></div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>}
    {type === 'users' && <nav className="mt-8 flex gap-2 border-b border-slate-200" aria-label="Разделы профиля">
      <button type="button" onClick={() => setActiveTab('profile')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'profile' ? 'border-brand text-brand' : 'border-transparent text-slate-600'}`}>Профиль</button>
      {ownUserProfile && <button type="button" onClick={() => setActiveTab('friends')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'friends' ? 'border-brand text-brand' : 'border-transparent text-slate-600'}`}>Друзья{friendsLoaded ? ` · ${friends.length}` : ''}</button>}
      {ownUserProfile && <button type="button" onClick={() => setActiveTab('subscriptions')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'subscriptions' ? 'border-brand text-brand' : 'border-transparent text-slate-600'}`}>Подписки</button>}
      <button type="button" onClick={() => setActiveTab('achievements')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'achievements' ? 'border-brand text-brand' : 'border-transparent text-slate-600'}`}>Достижения</button>
    </nav>}
    {(!ownUserProfile || activeTab === 'profile') && <>
      {type === 'users' && profile.canEdit && <InterestsPanel />}
      <section className="pt-8"><h2 className="text-2xl font-bold">Текущие мероприятия</h2>{profile.events.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{profile.events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <p className="mt-4 text-slate-500">Сейчас активных мероприятий нет.</p>}</section>
    </>}
    {ownUserProfile && activeTab === 'friends' && <section className="pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-2xl font-bold">Друзья</h2>{friendsLoaded && <span className="text-sm text-slate-500">{friends.length}</span>}</div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-bold">Найти друга</h3>
        <form onSubmit={searchFriend} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="friend-email" className="sr-only">Электронная почта пользователя</label>
          <input id="friend-email" type="email" required value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} placeholder="Введите почту пользователя" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand" />
          <button disabled={friendSearching} className="flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-on-brand disabled:opacity-50"><Search className="h-4 w-4" />{friendSearching ? 'Ищем…' : 'Найти'}</button>
        </form>
        {friendSearchMessage && <p className="mt-3 text-sm text-red-700">{friendSearchMessage}</p>}
        {friendSearch && <article className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">{friendSearch.avatarUrl ? <img src={friendSearch.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6 text-slate-500" />}</div>
          <div className="min-w-0 flex-1"><Link to={`/profiles/users/${friendSearch.userId}`} className="font-semibold text-slate-900 hover:text-brand">{friendSearch.fullName}</Link><p className="truncate text-sm text-slate-500">{friendSearch.email}</p></div>
          {friendSearch.state === 'NONE' && <button disabled={friendBusy} onClick={() => setFriendship('request', friendSearch.userId)} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50">Добавить в друзья</button>}
          {friendSearch.state === 'OUTGOING_PENDING' && <button disabled={friendBusy} onClick={() => setFriendship('remove', friendSearch.userId)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Заявка отправлена · Отменить</button>}
          {friendSearch.state === 'INCOMING_PENDING' && <div className="flex gap-2"><button disabled={friendBusy} onClick={() => setFriendship('accept', friendSearch.userId)} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50">Принять</button><button disabled={friendBusy} onClick={() => setFriendship('reject', friendSearch.userId)} className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50">Отклонить</button></div>}
          {friendSearch.state === 'FRIENDS' && <span className="rounded-full bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand-ink">Уже в друзьях</span>}
        </article>}
      </div>
      {friendRequests.length > 0 && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-bold">Входящие заявки</h3><div className="mt-4 space-y-3">{friendRequests.map((request) => <div key={request.userId} className="flex flex-wrap items-center gap-3"><div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">{request.avatarUrl && <img src={request.avatarUrl} alt="" className="h-full w-full object-cover" />}</div><span className="mr-auto font-medium">{request.fullName}</span><button disabled={friendBusy} onClick={() => setFriendship('accept', request.userId)} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-on-brand disabled:opacity-50">Принять</button><button disabled={friendBusy} onClick={() => setFriendship('reject', request.userId)} className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50">Отклонить</button></div>)}</div></div>}
      {friendsLoading && <p className="mt-5 text-slate-500">Загружаем друзей...</p>}
      {!friendsLoading && friendsLoaded && (friends.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{friends.map((friend) => <article key={friend.userId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-200">{friend.avatarUrl && <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />}</div><Link to={`/profiles/users/${friend.userId}`} className="min-w-0 flex-1 truncate font-semibold text-slate-900 hover:text-brand">{friend.fullName}</Link><button disabled={friendBusy} onClick={() => setFriendship('remove', friend.userId)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Удалить</button></article>)}</div> : <p className="mt-5 text-slate-500">Пока нет подтверждённых друзей. Откройте профиль спортсмена, чтобы отправить заявку.</p>)}
    </section>}
    {ownUserProfile && activeTab === 'subscriptions' && <section className="pt-8">
      <div className="flex items-baseline justify-between"><h2 className="text-2xl font-bold">Подписки</h2><span className="text-sm text-slate-500">{subscriptions.length}</span></div>
      {subscriptionsLoading ? <p className="mt-5 text-slate-500">Загружаем подписки...</p> : subscriptions.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{subscriptions.map((item) => <article key={item.organizationId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-200">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-slate-500" />}</div><div className="min-w-0 flex-1"><Link to={`/profiles/organizations/${item.organizationId}`} className="block truncate font-semibold text-slate-900 hover:text-brand">{item.name}</Link><p className="text-sm text-slate-500">{item.subscriberCount} подписчиков</p></div><button disabled={subscriptionBusy} onClick={async () => { setSubscriptionBusy(true); try { await subscriptionsApi.unsubscribe(item.organizationId); setSubscriptions((items) => items.filter((entry) => entry.organizationId !== item.organizationId)); } catch (err) { setError(errorMessage(err)); } finally { setSubscriptionBusy(false); } }} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Отписаться</button></article>)}</div> : <p className="mt-5 text-slate-500">Вы пока не подписаны ни на одну организацию.</p>}
    </section>}
    {type === 'users' && activeTab === 'achievements' && <section className="pt-8"><div className="flex items-end justify-between"><h2 className="text-2xl font-bold">Достижения</h2><span className="text-sm text-muted">Получено {achievements.filter((a) => a.completed).length} из {achievements.length}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{achievements.map((a) => <article key={a.code} className={`rounded-2xl border p-5 ${a.completed ? 'border-brand-line bg-brand-tint' : 'border-line bg-white'}`}><div className="flex items-start gap-3"><span className={`text-3xl ${a.completed ? '' : 'grayscale opacity-50'}`}>{a.icon}</span><div><h3 className="font-bold text-ink">{a.title}</h3><p className="mt-1 text-sm text-muted">{a.description}</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand" style={{width:`${Math.min(100,a.progress/a.target*100)}%`}} /></div><p className="mt-2 text-xs font-semibold text-muted">{a.completed ? 'Выполнено' : `${a.progress} из ${a.target}`}</p></article>)}</div></section>}
  </div>;
}
