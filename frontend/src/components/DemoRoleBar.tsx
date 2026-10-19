import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Shield, Building2, Clock } from 'lucide-react';

export const DemoRoleBar: React.FC = () => {
  const { activeRoleKey, switchRole, currentUser } = useAuth();

  const roles = [
    {
      key: 'user' as const,
      label: '🏃 Иван (Пользователь)',
      desc: 'Обычный участник',
      icon: UserCheck,
      color: 'bg-blue-600',
    },
    {
      key: 'enisey' as const,
      label: '🏆 СК «Енисей»',
      desc: 'Одобренный клуб',
      icon: Building2,
      color: 'bg-emerald-600',
    },
    {
      key: 'ladya' as const,
      label: '⏳ Клуб «Ладья»',
      desc: 'На модерации',
      icon: Clock,
      color: 'bg-amber-600',
    },
    {
      key: 'admin' as const,
      label: '🛡️ Администратор',
      desc: 'Модерация платформы',
      icon: Shield,
      color: 'bg-purple-600',
    },
  ];

  return (
    <header className="bg-slate-900 text-white px-4 py-2 border-b border-slate-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
            Жюри / Демо-режим
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Мгновенное переключение ролей:
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {roles.map((r) => {
            const isActive = activeRoleKey === r.key;
            return (
              <button
                key={r.key}
                onClick={() => switchRole(r.key)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? `${r.color} text-white shadow-sm ring-2 ring-white/30 scale-105`
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={r.desc}
              >
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-300 hidden md:flex items-center gap-2">
          <span>Текущий: <b>{currentUser.fullName}</b></span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
            {currentUser.role}
          </span>
        </div>
      </div>
    </header>
  );
};
