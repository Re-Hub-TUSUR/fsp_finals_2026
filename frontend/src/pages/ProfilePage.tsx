import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { profilesApi, subscriptionsApi } from '../api';
import { errorMessage } from '../api/client';
import { EventCard } from '../components/EventCard';
import { InterestsPanel } from '../components/InterestsPanel';
import { ErrorNotice, Tab, Tabs } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { AchievementsTab } from './profile/AchievementsTab';
import { FriendsTab } from './profile/FriendsTab';
import { ProfileEditForm, ProfileHeader } from './profile/ProfileHeader';
import { SubscriptionsTab } from './profile/SubscriptionsTab';
import { changeFriendship, type FriendshipAction } from './profile/friendship';

type ProfileTab = 'profile' | 'friends' | 'subscriptions' | 'achievements';

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
  const { currentUser, refreshUser, logout } = useAuth();
  const ownUserProfile = type === 'users' && currentUser?.id === id;

  // Вкладка сбрасывается при переходе на другой профиль: ключ состояния — адрес профиля
  const profileKey = `${type}/${id}`;
  const [tabState, setTabState] = useState<{ key: string; tab: ProfileTab }>({ key: profileKey, tab: 'profile' });
  const activeTab = tabState.key === profileKey ? tabState.tab : 'profile';
  const setActiveTab = (tab: ProfileTab) => setTabState({ key: profileKey, tab });

  const {
    data: profile,
    loading,
    error,
    mutate,
    setError,
  } = useApi(() => (type === 'organizations' ? profilesApi.organization(id) : profilesApi.user(id)), [type, id, currentUser?.id]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleSubscription = () =>
    run(async () => {
      if (!profile || profile.type !== 'ORGANIZATION') return;
      if (profile.subscribed) await subscriptionsApi.unsubscribe(profile.id);
      else await subscriptionsApi.subscribe(profile.id);
      mutate((p) =>
        p && {
          ...p,
          subscribed: !p.subscribed,
          subscriberCount: Math.max(0, (p.subscriberCount ?? 0) + (p.subscribed ? -1 : 1)),
        },
      );
    });

  const onFriendship = (action: FriendshipAction) =>
    run(async () => {
      if (!profile) return;
      const friendshipState = await changeFriendship(action, profile.id);
      mutate((p) => p && { ...p, friendshipState });
    });

  if (error && !profile) return <p className="mx-auto max-w-5xl p-8 text-red-700">{error}</p>;
  // loading — и при переходе на другой профиль: прежние данные не показываем под новым адресом
  if (loading || !profile) return <p className="p-8 text-center text-slate-500">Загрузка профиля...</p>;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8 w-full min-w-0 overflow-x-hidden">
      <ProfileHeader
        profile={profile}
        canSubscribe={currentUser?.role === 'ROLE_USER'}
        showLogout={forcedId != null}
        busy={busy}
        onLogout={logout}
        onToggleSubscription={() => void toggleSubscription()}
        onFriendship={(action) => void onFriendship(action)}
        onEdit={() => setEditing(true)}
      />
      {error && <ErrorNotice message={error} className="mt-4" />}
      {editing && (
        <ProfileEditForm
          profile={profile}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            mutate(() => saved);
            setEditing(false);
            void refreshUser();
          }}
        />
      )}

      {type === 'users' && (
        <Tabs label="Разделы профиля" className="mt-6 sm:mt-8 mb-0">
          <Tab active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
            Профиль
          </Tab>
          {ownUserProfile && (
            <Tab active={activeTab === 'friends'} onClick={() => setActiveTab('friends')}>
              Друзья
            </Tab>
          )}
          {ownUserProfile && (
            <Tab active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>
              Подписки
            </Tab>
          )}
          <Tab active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')}>
            Достижения
          </Tab>
        </Tabs>
      )}

      {activeTab === 'profile' && (
        <>
          {type === 'users' && profile.canEdit && <InterestsPanel />}
          <section className="pt-8">
            <h2 className="text-2xl font-bold">Текущие мероприятия</h2>
            {profile.events.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profile.events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-slate-500">Сейчас активных мероприятий нет.</p>
            )}
          </section>
        </>
      )}
      {ownUserProfile && activeTab === 'friends' && <FriendsTab />}
      {ownUserProfile && activeTab === 'subscriptions' && <SubscriptionsTab />}
      {type === 'users' && activeTab === 'achievements' && <AchievementsTab userId={id} />}
    </div>
  );
}
