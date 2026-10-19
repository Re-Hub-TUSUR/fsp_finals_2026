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
    <label className="block text-sm font-semibold text-ink">
      {label}
      <input
        required
        type={type}
        value={form[key] ?? ''}
        onChange={(e) => change(key, e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-ink outline-none transition focus:border-[#04D793] focus:ring-1 focus:ring-[#04D793] dark:focus:border-[#D5F45B] dark:focus:ring-[#D5F45B]"
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-lg px-3 sm:px-4 py-8 sm:py-12 w-full min-w-0 overflow-x-hidden">
      <div className="bg-card border border-line-2 rounded-2xl p-5 sm:p-8 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </h1>

        <div className="mt-6 grid grid-cols-3 border-b border-line-2">
          {([['login', 'Войти'], ['user', 'Пользователь'], ['organization', 'Организация']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMode(key); setError(''); }}
              className={`py-3 text-sm font-bold transition-colors ${
                mode === key
                  ? 'border-b-2 border-[#04D793] text-[#04D793] dark:border-[#D5F45B] dark:text-[#D5F45B]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode !== 'login' && (
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-surface border border-line-2 p-4 text-sm text-ink">
            {mode === 'user' ? (
              <UserRound className="shrink-0 text-[#04D793] dark:text-[#D5F45B] mt-0.5" />
            ) : (
              <Building2 className="shrink-0 text-[#04D793] dark:text-[#D5F45B] mt-0.5" />
            )}
            <p className="leading-relaxed">
              {mode === 'user'
                ? 'Пользователь получает доступ сразу после регистрации.'
                : 'После регистрации заявка организации отправится администратору. До одобрения публиковать мероприятия нельзя.'}
            </p>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'user' && (
            <div className="grid grid-cols-2 gap-3">
              {input('firstName', 'Имя')}
              {input('lastName', 'Фамилия')}
            </div>
          )}
          {mode === 'organization' && (
            <>
              {input('name', 'Название организации')}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {input('inn', 'ИНН')}
                {input('ogrn', 'ОГРН')}
                {input('kpp', 'КПП')}
              </div>
            </>
          )}
          {input('email', 'Электронная почта', 'email')}
          {input('password', 'Пароль (минимум 8 символов)', 'password')}

          {error && (
            <p className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-400 font-medium">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            type="submit"
            className="w-full rounded-xl bg-[#04D793] hover:bg-[#03c485] dark:bg-[#D5F45B] dark:hover:bg-[#c4e447] text-white dark:text-[#111315] font-bold text-base py-3.5 shadow-sm active:scale-[0.99] transition disabled:opacity-50"
          >
            {busy ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
}
