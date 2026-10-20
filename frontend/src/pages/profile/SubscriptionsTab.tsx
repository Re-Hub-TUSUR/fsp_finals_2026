import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { subscriptionsApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { ErrorNotice } from '../../components/ui';

/** Вкладка «Подписки»: организации, на которые подписан пользователь. */
export const SubscriptionsTab: React.FC = () => {
  const { data, loading, error, reload, mutate, setError } = useApi(() => subscriptionsApi.list(), []);
  const [busyId, setBusyId] = useState<number | null>(null);
  const items = data ?? [];

  const unsubscribe = async (organizationId: number) => {
    setBusyId(organizationId);
    try {
      await subscriptionsApi.unsubscribe(organizationId);
      mutate((list) => list?.filter((entry) => entry.organizationId !== organizationId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="pt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold">Подписки</h2>
        <span className="text-sm text-slate-500">{items.length}</span>
      </div>
      {error && <ErrorNotice message={error} onRetry={reload} className="mt-5" />}
      {loading ? (
        <p className="mt-5 text-slate-500">Загружаем подписки...</p>
      ) : items.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.organizationId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-200">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-6 w-6 text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/profiles/organizations/${item.organizationId}`} className="block truncate font-semibold text-slate-900 hover:text-brand">
                  {item.name}
                </Link>
                <p className="text-sm text-slate-500">{item.subscriberCount} подписчиков</p>
              </div>
              <button
                type="button"
                disabled={busyId === item.organizationId}
                onClick={() => void unsubscribe(item.organizationId)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Отписаться
              </button>
            </article>
          ))}
        </div>
      ) : (
        !error && <p className="mt-5 text-slate-500">Вы пока не подписаны ни на одну организацию.</p>
      )}
    </section>
  );
};
