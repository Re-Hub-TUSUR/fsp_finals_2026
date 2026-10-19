import React, { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowUpRight, ChevronDown, List, LogIn, LogOut, Map as MapIcon, MapPin, Moon, Plus, Search, Sparkles, Sun, UserRound, X } from 'lucide-react';

const Logo: React.FC = () => (
  <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Sportikus — на главную">
    <span className="w-10 h-10 rounded-xl bg-brand text-on-brand flex items-center justify-center">
      <ArrowUpRight className="w-6 h-6" strokeWidth={2.2} />
    </span>
    <span className="text-[22px] sm:text-[26px] font-extrabold tracking-[-0.03em] text-ink">Sportikus</span>
  </Link>
);

const AccountAvatar: React.FC<{ userId: number; src?: string }> = ({ userId, src }) => {
  const [failed, setFailed] = useState(false);

  return (
    <span
      key={`${userId}-${src ?? 'empty'}`}
      className="w-11 h-11 rounded-full bg-surface text-ink flex items-center justify-center overflow-hidden shrink-0"
    >
      {src && !failed ? (
        <img
          key={`${userId}-${src}`}
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound className="w-5 h-5" />
      )}
    </span>
  );
};

export const Navbar: React.FC = () => {
  const { currentUser, logout, preferences } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const onHome = location.pathname === '/' || location.pathname === '/events';
  const homeView = onHome ? (params.get('view') === 'list' ? 'list' : 'map') : null;
  const isActive = (path: string) => location.pathname === path;
  const linkClass = (active: boolean) =>
    `h-11 px-3.5 flex items-center gap-2 rounded-xl text-[15px] font-semibold transition-colors ${
      active ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
    }`;
  // Ссылка на режим главной с сохранением поиска
  const homeLink = (view: 'map' | 'list') => {
    const p = new URLSearchParams(onHome ? params : undefined);
    if (view === 'list') p.set('view', 'list');
    else p.delete('view');
    const qs = p.toString();
    return qs ? `/?${qs}` : '/';
  };
  const q = onHome ? (params.get('q') ?? '') : '';
  const setQuery = (value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set('q', value);
    else p.delete('q');
    setParams(p, { replace: true });
  };

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
      <div className="px-4 sm:px-6 h-16 lg:h-[72px] flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-4 lg:gap-5 min-w-0">
          <Logo />

          <span className="hidden xl:flex shrink-0 h-11 px-3 items-center gap-2 rounded-[14px] bg-surface text-[15px] font-semibold text-ink">
            <MapPin className="w-[18px] h-[18px] text-muted" />
            {preferences?.homeCity?.name ?? 'Красноярск'}
            <ChevronDown className="w-4 h-4 text-muted" />
          </span>

          {onHome && (
            <label className="hidden lg:flex flex-1 min-w-[200px] max-w-[460px] h-[46px] items-center gap-2.5 pl-3.5 pr-1.5 rounded-[14px] bg-surface text-muted focus-within:ring-2 focus-within:ring-brand/40">
              <Search className="w-5 h-5 shrink-0" />
              <input
                type="search"
                aria-label="Поиск мероприятий"
                placeholder="Спорт, место или клуб"
                value={q}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-medium text-ink placeholder:text-muted"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Очистить"
                  className="shrink-0 w-[34px] h-[34px] rounded-[10px] bg-white text-ink flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
          )}

          <div className="hidden md:flex items-center gap-0.5 shrink-0">
            <Link to={homeLink('list')} className={linkClass(homeView === 'list')}>
              <List className="w-[18px] h-[18px]" />
              Список
            </Link>
            <Link to={homeLink('map')} className={linkClass(homeView === 'map')}>
              <MapIcon className="w-[18px] h-[18px]" />
              Карта
            </Link>
            {currentUser && !isAdmin && (
              <Link to="/recommended" className={`${linkClass(isActive('/recommended'))} gap-1.5`}>
                <Sparkles className="w-[18px] h-[18px] text-brand-ink" />
                Для вас
              </Link>
            )}
            {currentUser && !isAdmin && (
              <Link to="/my" className={linkClass(isActive('/my'))}>
                Мои
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
              className="hidden md:flex items-center gap-1.5 h-11 px-4 rounded-[14px] bg-brand text-on-brand text-[15px] font-bold hover:bg-brand-hover transition-colors"
            >
              <Plus className="w-5 h-5" />
              Создать
            </Link>
          )}

          {currentUser && (
            <div className="flex items-center gap-2.5" title={currentUser.organizationName ?? currentUser.fullName}>
              <Link to="/profile" className="flex items-center gap-2.5" aria-label="Открыть профиль">
              <AccountAvatar key={`${currentUser.id}-${currentUser.avatarUrl ?? 'empty'}`} userId={currentUser.id} src={currentUser.avatarUrl} />
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
