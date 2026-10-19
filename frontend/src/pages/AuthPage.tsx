import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, UserRound } from 'lucide-react';
import { authApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'user' | 'organization';

export function AuthPage() {
  const { currentUser, login, acceptAuth } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (currentUser) return <Navigate to="/" replace />;

  const change = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else {
        const result = mode === 'user'
          ? await authApi.registerUser({ email: form.email, firstName: form.firstName, lastName: form.lastName, password: form.password })
          : await authApi.registerOrganization({ name: form.name, inn: form.inn, ogrn: form.ogrn, kpp: form.kpp, email: form.email, password: form.password });
        acceptAuth(result.token, result.user);
      }
      navigate(mode === 'organization' ? '/profile' : '/');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const input = (key: string, label: string, type = 'text') => (
    <label className="block text-sm font-medium text-slate-700">{label}
      <input required type={type} value={form[key] ?? ''} onChange={(e) => change(key, e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600" />
    </label>
  );
  return <div className="mx-auto max-w-lg px-4 py-10">
    <h1 className="text-3xl font-bold text-slate-900">{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
    <div className="mt-6 grid grid-cols-3 border-b border-slate-200">
      {([['login','Войти'],['user','Пользователь'],['organization','Организация']] as const).map(([key,label]) =>
        <button key={key} onClick={() => { setMode(key); setError(''); }} className={`py-3 text-sm font-semibold ${mode === key ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500'}`}>{label}</button>)}
    </div>
    {mode !== 'login' && <div className="mt-5 flex items-start gap-3 rounded-md bg-slate-100 p-4 text-sm text-slate-700">
      {mode === 'user' ? <UserRound className="shrink-0" /> : <Building2 className="shrink-0" />}
      {mode === 'user' ? 'Пользователь получает доступ сразу после регистрации.' : 'После регистрации заявка организации отправится администратору. До одобрения публиковать мероприятия нельзя.'}
    </div>}
    <form onSubmit={submit} className="mt-6 space-y-4">
      {mode === 'user' && <><div className="grid grid-cols-2 gap-3">{input('firstName','Имя')}{input('lastName','Фамилия')}</div></>}
      {mode === 'organization' && <>{input('name','Название организации')}<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{input('inn','ИНН')}{input('ogrn','ОГРН')}{input('kpp','КПП')}</div></>}
      {input('email','Электронная почта','email')}{input('password','Пароль (минимум 8 символов)','password')}
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
    </form>
  </div>;
}
