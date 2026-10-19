import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarPlus,
  CheckCheck,
  CheckCircle2,
  Inbox,
  Loader2,
  UserCheck,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { notificationsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../types';

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    if (diff < 172800) return 'вчера';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export const NotificationBell: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (!currentUser) return;
    if (showLoading) setLoading(true);
    try {
      const res = await notificationsApi.list();
      setUnreadCount(res.unreadCount);
      setItems(res.items);
    } catch {
      // Игнорируем сетевые сбои поллинга
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    void fetchNotifications(true);
    const interval = setInterval(() => void fetchNotifications(false), 20000);
    return () => clearInterval(interval);
  }, [currentUser, fetchNotifications]);

  // Закрытие при клике вне панели
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!currentUser) return null;

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
      } catch {
        // ignore
      }
    }
    setOpen(false);
    if (n.linkUrl) {
      navigate(n.linkUrl);
    }
  };

  const renderIcon = (n: AppNotification) => {
    switch (n.type) {
      case 'PARTICIPATION_CONFIRMED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />;
      case 'PARTICIPATION_REJECTED':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />;
      case 'EVENT_INVITE':
        return <CalendarPlus className="w-5 h-5 text-brand shrink-0 mt-0.5" />;
      case 'FRIEND_REQUEST':
        return <UserPlus className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />;
      case 'FRIEND_ACCEPTED':
        return <UserCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />;
      default:
        return <Bell className="w-5 h-5 text-muted shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void fetchNotifications(false);
        }}
        aria-label="Уведомления"
        title={unreadCount > 0 ? `${unreadCount} новых уведомлений` : 'Уведомления'}
        className="relative w-[42px] h-[42px] rounded-[10px] border border-line-2 bg-card flex items-center justify-center text-ink hover:bg-surface transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-brand text-on-brand text-[11px] font-extrabold flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed inset-x-2 top-18 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[380px] max-h-[500px] bg-card border border-line-2 rounded-2xl shadow-2xl flex flex-col z-[2200] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Заголовок */}
          <div className="p-4 border-b border-line-2 flex items-center justify-between bg-surface/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-ink text-base">Уведомления</span>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/15 text-brand font-bold">
                  {unreadCount} новых
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Отметить все как прочитанные"
                  className="px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink hover:bg-surface rounded-lg flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Прочитать все</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Список уведомлений */}
          <div className="flex-1 overflow-y-auto divide-y divide-line-2">
            {loading && items.length === 0 ? (
              <div className="py-12 flex justify-center text-muted">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-ink">Уведомлений нет</p>
                <p className="text-xs mt-1">Здесь будут приглашения от друзей и подтверждения заявок</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left p-3.5 flex gap-3 transition-colors hover:bg-surface ${
                    n.read ? 'opacity-75' : 'bg-brand/5'
                  }`}
                >
                  {renderIcon(n)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.read ? 'text-ink font-semibold' : 'text-ink font-bold'}`}>
                        {n.title}
                      </p>
                      <span className="text-[11px] text-muted shrink-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0 self-center" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
