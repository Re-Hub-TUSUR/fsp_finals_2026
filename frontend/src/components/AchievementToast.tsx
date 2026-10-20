import { useCallback, useEffect, useState } from 'react';
import { achievementsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Achievement } from '../types';
import { usePolling } from '../hooks/usePolling';

export function AchievementToast() {
  const { currentUser } = useAuth();
  const [toast, setToast] = useState<Achievement>();
  const enabled = !!currentUser && currentUser.role !== 'ROLE_ADMIN';
  const userId = currentUser?.id;

  const check = useCallback(() => {
    if (userId == null) return;
    const key = `sportikus-achievements-${userId}`;
    achievementsApi
      .mine()
      .then((items) => {
        const done = items.filter((a) => a.completed).map((a) => a.code);
        const previous = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
        const fresh = items.find((a) => a.completed && !previous.includes(a.code));
        localStorage.setItem(key, JSON.stringify(done));
        if (previous.length && fresh) setToast(fresh);
      })
      // Фоновая проверка: сбой сети просто откладывает уведомление до следующего опроса
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (enabled) check();
  }, [enabled, check]);
  usePolling(check, 15_000, enabled);

  useEffect(() => { if (!toast) return; const timer=setTimeout(() => setToast(undefined),5000); return () => clearTimeout(timer); }, [toast]);
  if (!toast) return null;
  return <div className="fixed bottom-5 right-5 z-toast w-[320px] rounded-2xl border border-brand-line bg-white p-4 shadow-2xl"><div className="flex gap-3"><span className="text-3xl">{toast.icon}</span><div><p className="text-xs font-bold uppercase tracking-wide text-brand-ink">Достижение получено</p><p className="mt-1 font-bold text-ink">{toast.title}</p><p className="text-sm text-muted">{toast.description}</p></div></div></div>;
}
