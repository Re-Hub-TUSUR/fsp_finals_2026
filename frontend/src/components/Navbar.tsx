import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowUpRight, ChevronDown, LogIn, LogOut, MapPin, Moon, Plus, Sun, UserRound } from 'lucide-react';

const Logo: React.FC = () => (
  <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Sportikus — на главную">
    <span className="w-10 h-10 rounded-xl bg-brand text-on-brand flex items-center justify-center">
      <ArrowUpRight className="w-6 h-6" strokeWidth={2.2} />
    </span>
    <span className="text-[22px] sm:text-[26px] font-extrabold tracking-[-0.03em] text-ink">Sportikus</span>
  </Link>
);

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const isActive = (path: string) => location.pathname === path;
  const linkClass = (active: boolean) =>
    `h-10 px-3 flex items-center rounded-xl text-[17px] transition-colors ${
      active ? 'text-ink font-medium' : 'text-muted hover:text-ink'
    }`;

  const orgStatus =
    currentUser?.orgStatus === 'APPROVED'
      ? { text: '✓ Одобрен', cls: 'text-brand-ink' }
      : currentUser?.orgStatus === 'REJECTED'
        ? { text: '✕ Отклонён', cls: 'text-red-600' }
        : currentUser?.orgStatus
          ? { text: '⏳ На модерации', cls: 'text-amber-700' }
          : null;

  return (
    <nav className="bg-white border-b border-line relative z-40">
      <div className="px-4 sm:px-6 lg:px-10 h-16 lg:h-[76px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 lg:gap-8 min-w-0">
          <Logo />

          <span className="hidden lg:flex items-center gap-1.5 text-[17px] text-ink">
            <MapPin className="w-[18px] h-[18px] text-muted" />
            Красноярск
            <ChevronDown className="w-4 h-4 text-muted" />
          </span>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className={linkClass(isActive('/'))}>
              Карта
            </Link>
            {currentUser && !isAdmin && (
              <Link to="/my" className={linkClass(isActive('/my'))}>
                Мои события
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={linkClass(isActive('/admin'))}>
                Модерация
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {!isAdmin && (
            <Link
              to="/events/new"
              className="hidden md:flex items-center gap-2 h-12 px-5 rounded-2xl bg-brand text-on-brand text-[17px] font-medium hover:bg-brand-hover transition-colors"
            >
              <Plus className="w-5 h-5" />
              Создать событие
            </Link>
          )}

          {currentUser && (
            <div className="flex items-center gap-2.5" title={currentUser.organizationName ?? currentUser.fullName}>
              <Link to="/profile" className="flex items-center gap-2.5" aria-label="Открыть профиль">
              <span className="w-11 h-11 rounded-full bg-surface text-ink flex items-center justify-center overflow-hidden shrink-0">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserRound className="w-5 h-5" />
                )}
              </span>
              <span className="hidden xl:flex flex-col leading-tight">
                <span className="text-sm font-semibold text-ink max-w-[180px] truncate">
                  {currentUser.organizationName ?? currentUser.fullName}
                </span>
                {orgStatus && <span className={`text-[11px] font-medium ${orgStatus.cls}`}>{orgStatus.text}</span>}
              </span>
              </Link>
              <button type="button" onClick={logout} aria-label="Выйти" className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-surface hover:text-ink">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
          {!currentUser && (
            <Link to="/auth" className="flex items-center gap-2 h-11 px-4 rounded-xl bg-brand text-on-brand font-medium">
              <LogIn className="w-5 h-5" />
              <span className="hidden sm:inline">Войти</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
