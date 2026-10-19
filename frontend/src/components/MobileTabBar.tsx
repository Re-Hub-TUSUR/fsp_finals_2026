import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, List, Map as MapIcon, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Нижняя навигация на мобильном: всё в зоне большого пальца, «создать» — по центру. */
export const MobileTabBar: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const onHome = location.pathname === '/' || location.pathname === '/events';
  const isList = onHome && new URLSearchParams(location.search).get('view') === 'list';

  const tab = (to: string, label: string, icon: React.ReactNode, active: boolean) => (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 h-12 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
        active ? 'text-brand-ink' : 'text-muted'
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <nav
      aria-label="Основная навигация"
      className="md:hidden shrink-0 bg-white border-t border-line flex items-start px-1 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] relative z-40"
    >
      {tab('/', 'Карта', <MapIcon className="w-6 h-6" />, onHome && !isList)}
      {tab('/?view=list', 'Список', <List className="w-6 h-6" />, isList)}
      {!isAdmin && (
        <div className="flex-1 flex justify-center pt-0.5">
          <Link
            to="/events/new"
            aria-label="Создать событие"
            className="w-[52px] h-11 rounded-2xl bg-brand text-on-brand flex items-center justify-center shadow-[0_6px_16px_color-mix(in_oklab,var(--color-brand)_40%,transparent)]"
          >
            <Plus className="w-6 h-6" strokeWidth={2.4} />
          </Link>
        </div>
      )}
      {currentUser &&
        !isAdmin &&
        tab('/recommended', 'Для вас', <Sparkles className="w-6 h-6" />, location.pathname === '/recommended')}
      {currentUser &&
        !isAdmin &&
        tab('/my', 'Мои', <CalendarDays className="w-6 h-6" />, location.pathname === '/my')}
      {isAdmin && tab('/admin', 'Модерация', <ShieldCheck className="w-6 h-6" />, location.pathname === '/admin')}
    </nav>
  );
};
