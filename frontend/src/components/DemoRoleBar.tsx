import React from 'react';
import { DEMO_ACCOUNTS, useAuth } from '../context/AuthContext';
import type { DemoRoleKey } from '../context/AuthContext';

const ACTIVE_COLORS: Record<DemoRoleKey, string> = {
  user: 'bg-blue-600',
  olga: 'bg-sky-600',
  pro: 'bg-indigo-600',
  masha: 'bg-rose-600',
  enisey: 'bg-emerald-600',
  ladya: 'bg-amber-600',
  admin: 'bg-purple-600',
};

export const DemoRoleBar: React.FC = () => {
  const { activeRoleKey, switchRole, currentUser, authError } = useAuth();
  const keys = Object.keys(DEMO_ACCOUNTS) as DemoRoleKey[];

  return (
    <header className="bg-[#0e1116] text-snow px-4 py-2 border-b border-[#1f242b] shadow-md relative z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-bold bg-[#f59e0b33] text-[#fcd34d] px-2 py-0.5 rounded border border-[#f59e0b66]">
            Демо-режим
          </span>
          <span className="text-xs text-[#98a0a9] hidden lg:inline">Вход под реальным аккаунтом в 1 клик:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {keys.map((key) => {
            const isActive = activeRoleKey === key;
            return (
              <button
                key={key}
                onClick={() => void switchRole(key)}
                aria-pressed={isActive}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  isActive
                    ? `${ACTIVE_COLORS[key]} text-snow shadow-sm ring-2 ring-white/30`
                    : 'bg-[#1f242b] text-[#d0d5dc] hover:bg-[#323840] hover:text-snow'
                }`}
                title={DEMO_ACCOUNTS[key].hint}
              >
                {DEMO_ACCOUNTS[key].label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-[#d0d5dc] hidden xl:flex items-center gap-2">
          {authError ? (
            <span className="text-[#fca5a5]">{authError}</span>
          ) : (
            <>
              <span>
                Текущий: <b>{currentUser?.fullName ?? '—'}</b>
              </span>
              <span className="text-[10px] bg-[#1f242b] px-1.5 py-0.5 rounded text-[#98a0a9] font-mono">{currentUser?.role}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
