import React from 'react';
import { achievementsApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { ErrorNotice, LoadingBlock } from '../../components/ui';

/** Вкладка «Достижения»: прогресс по каждому достижению пользователя. */
export const AchievementsTab: React.FC<{ userId: number }> = ({ userId }) => {
  const { data, loading, error, reload } = useApi(() => achievementsApi.profile(userId), [userId]);
  const items = data ?? [];

  return (
    <section className="pt-8">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold">Достижения</h2>
        <span className="text-sm text-muted">
          Получено {items.filter((a) => a.completed).length} из {items.length}
        </span>
      </div>
      {error && <ErrorNotice message={error} onRetry={reload} className="mt-5" />}
      {loading && <LoadingBlock className="py-10" />}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <article key={a.code} className={`rounded-2xl border p-5 ${a.completed ? 'border-brand-line bg-brand-tint' : 'border-line bg-white'}`}>
            <div className="flex items-start gap-3">
              <span className={`text-3xl ${a.completed ? '' : 'grayscale opacity-50'}`}>{a.icon}</span>
              <div>
                <h3 className="font-bold text-ink">{a.title}</h3>
                <p className="mt-1 text-sm text-muted">{a.description}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (a.progress / a.target) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-muted">{a.completed ? 'Выполнено' : `${a.progress} из ${a.target}`}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
