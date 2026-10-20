import React, { useState } from 'react';
import { Building2, Edit3, GraduationCap, LogOut, Mail, Save, ShieldCheck, UserRound, X } from 'lucide-react';
import { profilesApi } from '../../api';
import { errorMessage } from '../../api/client';
import type { FriendshipState, Profile } from '../../types';
import { Button, inputClass } from '../../components/ui';
import type { FriendshipAction } from './friendship';

const ORG_STATUS: Record<string, string> = { APPROVED: 'одобрена', REJECTED: 'отклонена' };
const outline = 'w-full rounded-xl border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50';

/** Кнопки отношений с чужим пользователем: добавить, отменить заявку, ответить, удалить. */
const FriendshipButtons: React.FC<{ state: FriendshipState; busy: boolean; onAction: (action: FriendshipAction) => void }> = ({
  state,
  busy,
  onAction,
}) => {
  switch (state) {
    case 'NONE':
      return (
        <Button block disabled={busy} onClick={() => onAction('request')}>
          Добавить в друзья
        </Button>
      );
    case 'OUTGOING_PENDING':
      return (
        <button type="button" disabled={busy} onClick={() => onAction('remove')} className={outline}>
          Заявка отправлена · Отменить
        </button>
      );
    case 'INCOMING_PENDING':
      return (
        <div className="flex w-full gap-2">
          <Button disabled={busy} onClick={() => onAction('accept')} className="flex-1">
            Принять заявку
          </Button>
          <button type="button" disabled={busy} onClick={() => onAction('reject')} className={`flex-1 ${outline}`}>
            Отклонить
          </button>
        </div>
      );
    case 'FRIENDS':
      return (
        <button type="button" disabled={busy} onClick={() => onAction('remove')} className={outline}>
          Удалить из друзей
        </button>
      );
  }
};

export const ProfileHeader: React.FC<{
  profile: Profile;
  /** Показать «Подписаться» на организацию (только для пользователя). */
  canSubscribe: boolean;
  /** Свой профиль, открытый из меню: показываем «Выйти». */
  showLogout: boolean;
  busy: boolean;
  onLogout: () => void;
  onToggleSubscription: () => void;
  onFriendship: (action: FriendshipAction) => void;
  onEdit: () => void;
}> = ({ profile, canSubscribe, showLogout, busy, onLogout, onToggleSubscription, onFriendship, onEdit }) => {
  const isOrg = profile.type === 'ORGANIZATION';
  const friendship = !isOrg && !profile.canEdit ? (profile.friendshipState ?? 'NONE') : null;

  return (
    <section className="grid gap-5 border-b border-line pb-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8">
      <div className="flex h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-surface-2">
        {profile.imageUrl ? (
          <img src={profile.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : isOrg ? (
          <Building2 className="h-11 w-11 text-muted" />
        ) : (
          <UserRound className="h-11 w-11 text-muted" />
        )}
      </div>
      <div className="min-w-0 pt-1">
        <p className="text-sm font-semibold text-brand">{isOrg ? 'Организация' : 'Пользователь'}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-ink break-words">{profile.name}</h1>
        <p className="mt-3 flex items-center gap-2 text-muted break-words">
          <Mail className="h-5 w-5 shrink-0" />
          {profile.email}
        </p>
        {profile.description && <p className="mt-4 max-w-3xl text-slate-700 break-words">{profile.description}</p>}
        {isOrg && (
          <>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <span>ИНН: {profile.inn ?? 'не указан'}</span>
              <span>ОГРН: {profile.ogrn ?? 'не указан'}</span>
              <span>КПП: {profile.kpp ?? 'не указан'}</span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Статус: {ORG_STATUS[profile.status ?? ''] ?? 'на рассмотрении'}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">Подписчиков: {profile.subscriberCount ?? 0}</p>
          </>
        )}
      </div>
      <div className="flex w-full flex-col gap-3 sm:col-span-2 lg:col-span-1 lg:w-72">
        {profile.canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-card px-5 py-3 font-semibold text-ink transition-colors hover:bg-surface"
          >
            <Edit3 className="h-4 w-4" />
            Редактировать профиль
          </button>
        )}
        {(profile.canEdit || showLogout) && (
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-2 lg:justify-end">
            {profile.canEdit && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('start-sportikus-tour'))}
                className="flex items-center gap-1.5 py-1 text-sm font-semibold text-brand hover:text-brand-ink"
              >
                <GraduationCap className="h-4 w-4" />
                Обучение по сайту
              </button>
            )}
            {showLogout && (
              <button type="button" onClick={onLogout} className="flex items-center gap-1.5 py-1 text-sm font-semibold text-muted hover:text-ink">
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            )}
          </div>
        )}
        {isOrg && canSubscribe && !profile.canEdit && (
          <Button block variant={profile.subscribed ? 'secondary' : 'primary'} disabled={busy} onClick={onToggleSubscription}>
            {profile.subscribed ? 'Отписаться' : 'Подписаться'}
          </Button>
        )}
        {friendship && <FriendshipButtons state={friendship} busy={busy} onAction={onFriendship} />}
      </div>
    </section>
  );
};

/** Форма редактирования имени, описания (у организации) и фото профиля. */
export const ProfileEditForm: React.FC<{
  profile: Profile;
  onSaved: (profile: Profile) => void;
  onCancel: () => void;
}> = ({ profile, onSaved, onCancel }) => {
  const isOrg = profile.type === 'ORGANIZATION';
  const [form, setForm] = useState({ name: profile.name, description: profile.description ?? '', imageUrl: profile.imageUrl ?? '' });
  const [imageFile, setImageFile] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const api = isOrg
        ? { update: profilesApi.updateOrganization, upload: profilesApi.uploadOrganizationImage }
        : { update: profilesApi.updateUser, upload: profilesApi.uploadUserImage };
      let data = await api.update(profile.id, form);
      if (imageFile) data = await api.upload(profile.id, imageFile);
      onSaved(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="my-6 space-y-4 border-b border-slate-200 pb-6">
      <label className="block text-sm font-medium">
        Имя / название
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} mt-1`} required />
      </label>
      {isOrg && (
        <label className="block text-sm font-medium">
          Описание
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${inputClass} mt-1`}
            rows={4}
          />
        </label>
      )}
      <label className="block text-sm font-medium">
        Фото профиля
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setImageFile(e.target.files?.[0])}
          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:font-semibold file:text-on-brand"
        />
        <span className="mt-1 block text-xs text-slate-500">JPG, PNG или WebP, не более 5 МБ</span>
      </label>
      <div className="flex gap-3">
        <Button type="submit" loading={saving}>
          {!saving && <Save className="h-4 w-4" />}
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          <X className="h-4 w-4" />
          Отмена
        </Button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
};
