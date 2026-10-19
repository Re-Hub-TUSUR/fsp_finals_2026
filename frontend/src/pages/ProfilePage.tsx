import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Building2, Edit3, Mail, Save, ShieldCheck, UserRound, X } from 'lucide-react';
import { profilesApi } from '../api';
import { errorMessage } from '../api/client';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types';

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
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile>();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '' });
  const [imageFile, setImageFile] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError(''); setProfile(undefined);
    const request = type === 'organizations' ? profilesApi.organization(id) : profilesApi.user(id);
    request.then((data) => { setProfile(data); setForm({ name: data.name, description: data.description ?? '', imageUrl: data.imageUrl ?? '' }); }).catch((e) => setError(errorMessage(e)));
  }, [id, type]);

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
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <section className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-start">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-200">
        {profile.imageUrl ? <img src={profile.imageUrl} alt="" className="h-full w-full object-cover" /> : isOrg ? <Building2 className="h-10 w-10 text-slate-500" /> : <UserRound className="h-10 w-10 text-slate-500" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-emerald-700">{isOrg ? 'Организация' : 'Пользователь'}</p><h1 className="text-3xl font-bold text-slate-900">{profile.name}</h1></div>
          {profile.canEdit && <button onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"><Edit3 className="h-4 w-4" />Редактировать профиль</button>}
        </div>
        <p className="mt-3 flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4" />{profile.email}</p>
        {profile.description && <p className="mt-4 max-w-3xl text-slate-700">{profile.description}</p>}
        {isOrg && <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600"><span>ИНН: {profile.inn ?? 'не указан'}</span><span>ОГРН: {profile.ogrn ?? 'не указан'}</span><span>КПП: {profile.kpp ?? 'не указан'}</span></div>}
        {isOrg && <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" />Статус: {profile.status === 'APPROVED' ? 'одобрена' : profile.status === 'REJECTED' ? 'отклонена' : 'на рассмотрении'}</p>}
      </div>
    </section>
    {editing && <form onSubmit={save} className="my-6 space-y-4 border-b border-slate-200 pb-6">
      <label className="block text-sm font-medium">Имя / название<input value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-md border px-3 py-2" required /></label>
      {isOrg && <label className="block text-sm font-medium">Описание<textarea value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-md border px-3 py-2" rows={4} /></label>}
      <label className="block text-sm font-medium">Фото профиля<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files?.[0])} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:font-semibold file:text-on-brand" /><span className="mt-1 block text-xs text-slate-500">JPG, PNG или WebP, не более 5 МБ</span></label>
      <div className="flex gap-3"><button disabled={saving} className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-on-brand disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Сохранение...' : 'Сохранить'}</button><button type="button" onClick={() => { setEditing(false); setImageFile(undefined); }} className="flex items-center gap-2 rounded-md border px-4 py-2"><X className="h-4 w-4" />Отмена</button></div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>}
    <section className="pt-8"><h2 className="text-2xl font-bold">Текущие мероприятия</h2>{profile.events.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{profile.events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <p className="mt-4 text-slate-500">Сейчас активных мероприятий нет.</p>}</section>
  </div>;
}
