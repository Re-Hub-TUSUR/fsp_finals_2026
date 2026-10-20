import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Eye, EyeOff, ShieldCheck, UserRound } from 'lucide-react';
import { authApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { DemoRoleKey } from '../context/AuthContext';
import { safeNext } from '../utils/redirect';

type Mode = 'login' | 'user' | 'organization';

/** ?mode=user|organization — с лендинга открываем сразу нужную вкладку регистрации. */
const modeFromQuery = (value: string | null): Mode => (value === 'user' || value === 'organization' ? value : 'login');

export function AuthPage() {
  const { currentUser, login, acceptAuth, switchRole } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Куда вернуть после входа (ссылка на событие и т.п.); без ?next= — экран по роли, как раньше
  const next = params.get('next');
  const [mode, setMode] = useState<Mode>(() => modeFromQuery(params.get('mode')));
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<DemoRoleKey | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  if (currentUser) {
    const destination = currentUser.role === 'ROLE_ADMIN' ? '/admin' : currentUser.role === 'ROLE_ORGANIZER' ? '/profile' : '/';
    return <Navigate to={safeNext(next, destination)} replace />;
  }

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
        if (mode === 'user') {
          sessionStorage.setItem('sportikus_start_tour', '1');
        }
      }
      navigate(safeNext(next, mode === 'organization' ? '/profile' : '/'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const input = (key: string, label: string, type = 'text') => {
    const isPassword = type === 'password';
    return (
      <div className="block text-sm font-semibold text-ink">
        <label htmlFor={`auth-${key}`}>{label}</label>
        <span className="relative mt-1.5 block">
          <input
            id={`auth-${key}`}
            required
            type={isPassword && showPassword ? 'text' : type}
            value={form[key] ?? ''}
            onChange={(e) => change(key, e.target.value)}
            className={`w-full rounded-xl border border-line-2 bg-surface py-2.5 text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand ${isPassword ? 'pl-3.5 pr-11' : 'px-3.5'}`}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
        </span>
      </div>
    );
  };

  const demoLogin = async (role: DemoRoleKey, destination: string) => {
    setDemoBusy(role); setError('');
    try {
      await switchRole(role);
      navigate(safeNext(next, destination));
    } catch (err) {
      setError(errorMessage(err, 'Не удалось выполнить демо-вход'));
    } finally {
      setDemoBusy(null);
    }
  };

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
                  ? 'border-b-2 border-brand text-brand'
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
              <UserRound className="shrink-0 text-brand mt-0.5" />
            ) : (
              <Building2 className="shrink-0 text-brand mt-0.5" />
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
            className="w-full rounded-xl bg-brand hover:bg-brand-hover text-on-brand font-bold text-base py-3.5 shadow-sm active:scale-[0.99] transition disabled:opacity-50"
          >
            {busy ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-6 border-t border-line-2 pt-5">
            <p className="mb-3 text-center text-sm font-semibold text-muted">Демо-вход</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <DemoLoginButton icon={<UserRound className="h-4 w-4" />} label="Пользователь" busy={demoBusy === 'user'} disabled={demoBusy !== null || busy} onClick={() => void demoLogin('user', '/')} />
              <DemoLoginButton icon={<Building2 className="h-4 w-4" />} label="Организатор" busy={demoBusy === 'enisey'} disabled={demoBusy !== null || busy} onClick={() => void demoLogin('enisey', '/profile')} />
              <DemoLoginButton icon={<ShieldCheck className="h-4 w-4" />} label="Администратор" busy={demoBusy === 'admin'} disabled={demoBusy !== null || busy} onClick={() => void demoLogin('admin', '/admin')} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DemoLoginButton({ icon, label, busy, disabled, onClick }: { icon: ReactNode; label: string; busy: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-2 bg-surface px-3 py-2.5 text-sm font-bold text-ink transition hover:border-brand hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-50">
      {icon}
      <span>{busy ? 'Входим...' : label}</span>
    </button>
  );
}
