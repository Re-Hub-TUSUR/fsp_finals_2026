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
      className={`flex-1 h-[58px] flex flex-col items-center justify-center gap-[3px] text-xs font-bold ${
        active ? 'text-ink' : 'text-muted'
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <nav
      aria-label="Основная навигация"
      className="md:hidden shrink-0 bg-card border-t border-line-2 flex items-start px-1.5 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] relative z-40"
    >
      {tab('/', 'Карта', <MapIcon className="w-6 h-6" />, onHome && !isList)}
      {tab('/?view=list', 'Лента', <List className="w-6 h-6" />, isList)}
      {!isAdmin && (
        <div className="flex-1 flex justify-center pt-1">
          <Link
            to="/events/new"
            aria-label="Создать событие"
            className="w-[54px] h-[46px] rounded-xl bg-brand text-on-brand flex items-center justify-center"
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
