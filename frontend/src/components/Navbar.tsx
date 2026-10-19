import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { citiesApi } from '../api';
import type { City } from '../types';
import {
  CalendarCheck,
  ChevronDown,
  List,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';

const Logo: React.FC = () => (
  <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Sportikus — на главную">
    <span className="w-[38px] h-[38px] rounded-[10px] bg-brand text-on-brand flex items-center justify-center">
      <img src="/logo-s.png" alt="" className="h-[22px] w-auto" />
    </span>
    {/* Пока рядом вкладки и поиск не помещаются целиком (md–xl), оставляем только знак */}
    <span className="text-[22px] sm:text-2xl font-extrabold tracking-[-0.03em] text-ink md:max-xl:hidden">Sportikus</span>
  </Link>
);

const AccountAvatar: React.FC<{ userId: number; src?: string }> = ({ userId, src }) => {
  const [failed, setFailed] = useState(false);

  return (
    <span
      key={`${userId}-${src ?? 'empty'}`}
      className="w-9 h-9 sm:w-[42px] sm:h-[42px] rounded-full bg-surface-2 text-ink flex items-center justify-center overflow-hidden shrink-0"
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
        <UserRound className="w-4 h-4 sm:w-5 sm:h-5" />
      )}
    </span>
  );
};

export const Navbar: React.FC = () => {
  const { currentUser, logout, preferences } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [cities, setCities] = useState<City[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  useEffect(() => { citiesApi.list().then(setCities).catch(() => setCities([])); }, []);
  const selectedCity = cities.find((city) => String(city.id) === params.get('city'));
  const cityName = selectedCity?.name ?? preferences?.homeCity?.name ?? 'Красноярск';

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const isOrganizer = currentUser?.role === 'ROLE_ORGANIZER';
  const onHome = location.pathname === '/' || location.pathname === '/events';
  const homeView = onHome ? (params.get('view') === 'list' ? 'list' : 'map') : null;
  const isActive = (path: string) => location.pathname === path;
  // Вкладки с подчёркиванием во всю высоту шапки (макет «Карта и Лента»)
  const linkClass = (active: boolean) =>
    `h-full -mb-px px-2.5 xl:px-3 2xl:px-3.5 flex items-center gap-2 border-b-[3px] text-base whitespace-nowrap transition-all ${
      active
        ? 'border-brand text-ink font-bold shadow-[inset_0_-3px_10px_rgba(4,215,147,0.35)] dark:shadow-[inset_0_-3px_10px_rgba(213,244,91,0.25)]'
        : 'border-transparent text-muted font-semibold hover:text-ink'
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
    <nav className="bg-card border-b border-line-2 relative z-40 max-w-full overflow-hidden">
      <div className="px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 max-w-full">
        <div className="flex-1 self-stretch flex items-center gap-2 lg:gap-3 2xl:gap-4 min-w-0">
          <Logo />

          {/* Только значок: название города не помещается на ноутбуках, оно — в подсказке */}
          <button
            type="button"
            onClick={() => setCityOpen(true)}
            aria-label={`Город: ${cityName}. Выбрать другой`}
            title={cityName}
            className="hidden md:flex shrink-0 h-[42px] px-2 items-center gap-1 rounded-[10px] text-ink hover:bg-surface"
          >
            <MapPin className="w-[18px] h-[18px]" />
            <ChevronDown className="w-4 h-4 text-muted" />
          </button>

          {onHome && (
            <label className="hidden lg:flex flex-1 min-w-[150px] max-w-[420px] h-[42px] items-center gap-2.5 pl-3 pr-1.5 rounded-[10px] bg-surface border border-line-2 text-muted focus-within:border-ink">
              <Search className="w-[19px] h-[19px] shrink-0" />
              <input
                type="search"
                aria-label="Поиск мероприятий"
                placeholder="Спорт, место или клуб"
                value={q}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-base font-medium text-ink placeholder:text-muted"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Очистить"
                  className="shrink-0 w-[30px] h-[30px] rounded-lg bg-card text-ink flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
          )}

          <div className="flex-1" />

          {/* До lg вкладки — только иконки (подпись в подсказке и aria-label), иначе не помещаются */}
          <div className="hidden md:flex self-stretch gap-1 shrink-0">
            <Link to={homeLink('map')} aria-label="Карта" title="Карта" className={linkClass(homeView === 'map')}>
              <MapIcon className="w-[18px] h-[18px] shrink-0" />
              <span className="hidden lg:inline">Карта</span>
            </Link>
            <Link to={homeLink('list')} aria-label="Лента" title="Лента" className={linkClass(homeView === 'list')}>
              <List className="w-[18px] h-[18px] shrink-0" />
              <span className="hidden lg:inline">Лента</span>
            </Link>
            {currentUser && !isAdmin && !isOrganizer && (
              <Link to="/recommended" aria-label="Для вас" title="Для вас" className={linkClass(isActive('/recommended'))}>
                <Sparkles className="w-[18px] h-[18px] shrink-0 lg:hidden" />
                <span className="hidden lg:inline">Для вас</span>
              </Link>
            )}
            {currentUser && !isAdmin && (
              <Link to="/my" aria-label="Мои события" title="Мои события" className={linkClass(isActive('/my'))}>
                <CalendarCheck className="w-[18px] h-[18px] shrink-0 lg:hidden" />
                <span className="hidden lg:inline">Мои события</span>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" aria-label="Модерация" title="Модерация" className={linkClass(isActive('/admin'))}>
                <ShieldCheck className="w-[18px] h-[18px] shrink-0 lg:hidden" />
                <span className="hidden lg:inline">Модерация</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            className="w-9 h-9 sm:w-[42px] sm:h-[42px] rounded-[10px] border border-line-2 bg-card flex items-center justify-center text-ink hover:bg-surface transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <NotificationBell />

          {!isAdmin && (
            <Link
              to="/events/new"
              aria-label="Создать мероприятие"
              title="Создать мероприятие"
              className="hidden md:flex items-center gap-1.5 h-[42px] px-[11px] xl:px-4 rounded-[10px] bg-brand text-on-brand text-base font-bold hover:bg-brand-hover transition-colors shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden xl:inline">Создать</span>
            </Link>
          )}

          {currentUser && (
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0" title={currentUser.organizationName ?? currentUser.fullName}>
              <Link to="/profile" className="flex items-center gap-2.5 shrink-0" aria-label="Открыть профиль">
              <AccountAvatar key={`${currentUser.id}-${currentUser.avatarUrl ?? 'empty'}`} userId={currentUser.id} src={currentUser.avatarUrl} />
              {/* На ноутбуках имя не помещается рядом с вкладками — оно в подсказке над аватаром */}
              <span className="hidden 2xl:flex flex-col leading-tight">
                <span className="text-sm font-semibold text-ink max-w-[180px] truncate">
                  {currentUser.organizationName ?? currentUser.fullName}
                </span>
                {orgStatus && <span className={`text-[11px] font-medium ${orgStatus.cls}`}>{orgStatus.text}</span>}
              </span>
              </Link>
              <button type="button" onClick={logout} aria-label="Выйти" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-muted hover:bg-surface hover:text-ink shrink-0">
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}
          {!currentUser && (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-[42px] px-3 sm:px-4 rounded-[10px] border border-line-2 bg-card text-ink hover:bg-surface transition-colors font-semibold text-sm sm:text-base shrink-0"
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Войти</span>
            </Link>
          )}
        </div>
      </div>
      {cityOpen && <div className="fixed inset-0 z-[2100] bg-black/40 flex items-start justify-center p-4 pt-24" onMouseDown={() => setCityOpen(false)}><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onMouseDown={(e) => e.stopPropagation()}><h2 className="text-xl font-bold text-ink">Выберите город</h2><input autoFocus value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} placeholder="Введите название города" className="mt-4 w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-brand"/><div className="mt-3 max-h-72 overflow-auto">{cities.filter((c) => c.name.toLowerCase().includes(cityQuery.trim().toLowerCase())).map((city) => <button key={city.id} type="button" onClick={() => { const p=new URLSearchParams(params); p.set('city', String(city.id)); setParams(p); setCityOpen(false); setCityQuery(''); }} className="block w-full rounded-xl px-3 py-3 text-left hover:bg-surface"><b>{city.name}</b>{city.region && <span className="ml-2 text-sm text-muted">{city.region}</span>}</button>)}</div></div></div>}
    </nav>
  );
};
