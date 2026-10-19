import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, PlusCircle, ShieldAlert } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-10 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                  Sportikus
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                  Красноярск
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Карта и события
              </Link>
              {currentUser.role === 'ROLE_ADMIN' && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin')
                      ? 'bg-purple-100 text-purple-900'
                      : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  Модерация
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/events/new"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Создать событие</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                alt={currentUser.fullName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/20"
              />
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser.fullName}
                </span>
                {currentUser.orgStatus && (
                  <span className={`text-[10px] font-medium ${
                    currentUser.orgStatus === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {currentUser.orgStatus === 'APPROVED' ? '✓ Одобрен' : '⏳ На модерации'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
