import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Inbox, X } from 'lucide-react';
import { notificationsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../types';
import { NotificationItem } from './NotificationItem';
import { LoadingBlock } from './ui';

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
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
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
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notifications-panel"
        title={unreadCount > 0 ? `${unreadCount} новых уведомлений` : 'Уведомления'}
        className="relative w-9 h-9 sm:w-[42px] sm:h-[42px] rounded-control border border-line-2 bg-card flex items-center justify-center text-ink hover:bg-surface transition-colors shrink-0"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] rounded-full bg-brand text-on-brand text-[9px] leading-none font-extrabold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="notifications-panel"
          role="dialog"
          aria-label="Уведомления"
          // fixed, а не absolute: шапка с overflow-hidden обрезала бы панель на десктопе
          className="fixed inset-x-2 top-16 sm:inset-x-auto sm:right-4 sm:top-[68px] w-auto sm:w-[380px] max-w-[calc(100vw-16px)] max-h-[500px] bg-card border border-line-2 rounded-2xl shadow-2xl flex flex-col z-popover overflow-hidden animate-in fade-in zoom-in-95 duration-150"
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
                aria-label="Закрыть уведомления"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Список уведомлений */}
          <div className="flex-1 overflow-y-auto divide-y divide-line-2">
            {loading && items.length === 0 ? (
              <LoadingBlock className="py-12" />
            ) : items.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-ink">Уведомлений нет</p>
                <p className="text-xs mt-1">Здесь будут приглашения от друзей и подтверждения заявок</p>
              </div>
            ) : (
              items.map((n) => <NotificationItem key={n.id} n={n} onClick={handleItemClick} />)
            )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="shrink-0 border-t border-line-2 py-3 text-center text-sm font-semibold text-ink hover:bg-surface transition-colors"
          >
            Все уведомления
          </Link>
        </div>
      )}
    </div>
  );
};
