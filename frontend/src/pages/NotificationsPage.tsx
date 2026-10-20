import React, { useCallback, useEffect, useState } from 'react';
import { ErrorNotice } from '../components/ui';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCheck, Inbox, Loader2 } from 'lucide-react';
import { notificationsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../types';
import { NotificationItem } from '../components/NotificationItem';

/** Все уведомления списком — открывается из колокольчика («Все уведомления»). */
export const NotificationsPage: React.FC = () => {
  const { currentUser, ready } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    notificationsApi
      .list()
      .then((res) => setItems(res.items))
      .catch((e) => setError(errorMessage(e, 'Не удалось загрузить уведомления')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!ready || !currentUser) return;
    load();
  }, [ready, currentUser, load]);

  if (!ready) return null;
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-surface border border-line rounded-[20px] text-center text-ink">
        <p>Войдите, чтобы увидеть уведомления.</p>
        <Link to="/auth" className="inline-block mt-3 font-semibold text-brand-ink hover:underline">
          Войти
        </Link>
      </div>
    );
  }

  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const open = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id);
        setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
      } catch {
        // отметка прочитанного не должна мешать переходу
      }
    }
    if (n.linkUrl) navigate(n.linkUrl);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-ink">Уведомления</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            className="px-3 h-10 rounded-xl border border-line bg-card text-ink text-sm font-semibold hover:bg-surface flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            Прочитать все
          </button>
        )}
      </div>
      {error && <ErrorNotice message={error} onRetry={load} className="mb-3" />}
      <div className="bg-card border border-line rounded-[20px] overflow-hidden divide-y divide-line">
        {loading ? (
          <div className="py-12 flex justify-center text-muted">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 px-4 text-center text-muted">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-ink">Уведомлений нет</p>
          </div>
        ) : (
          items.map((n) => <NotificationItem key={n.id} n={n} onClick={open} />)
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
