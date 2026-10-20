import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LogIn, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { authLink } from '../../utils/redirect';

/** Лёгкая шапка для гостя (лендинг и вход): логотип, тема и «Войти» — без навигации приложения. */
export const GuestHeader: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  return (
    <header className="bg-card border-b border-line relative z-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-3">
        <Link to="/welcome" className="flex items-center gap-2.5 shrink-0" aria-label="Sportikus — о сервисе">
          <span className="w-[38px] h-[38px] rounded-control bg-brand text-on-brand flex items-center justify-center">
            <img src="/logo-s.png" alt="" className="h-[22px] w-auto" />
          </span>
          <span className="text-[22px] sm:text-2xl font-extrabold tracking-[-0.03em] text-ink">Sportikus</span>
        </Link>

        <div className="flex-1" />

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          className="w-11 h-11 rounded-control text-ink flex items-center justify-center hover:bg-surface"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {pathname !== '/auth' && (
          <Link
            to={authLink('login', params.get('next') ?? undefined)}
            className="h-11 px-4 rounded-xl border border-line-2 text-ink font-semibold flex items-center gap-2 hover:bg-surface"
          >
            <LogIn className="w-[18px] h-[18px]" />
            Войти
          </Link>
        )}
      </div>
    </header>
  );
};
