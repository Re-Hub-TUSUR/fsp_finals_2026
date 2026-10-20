import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  EyeOff,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { commentsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';
import type { EventComment } from '../types';
import { formatDateTime } from '../utils/format';
import { Button, LoadingBlock } from './ui';

interface EventDiscussionProps {
  eventId: number;
  eventTitle?: string;
  isEventOrganizer?: boolean;
}

export const EventDiscussion: React.FC<EventDiscussionProps> = ({
  eventId,
  isEventOrganizer,
}) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listBottomRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const fetchComments = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await commentsApi.forEvent(eventId);
        setComments(data);
        setError(null);
      } catch (e) {
        if (!silent) setError(errorMessage(e, 'Не удалось загрузить обсуждение'));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    isFirstLoad.current = true;
    void fetchComments(false);
  }, [fetchComments]);
  // Новые сообщения подтягиваем раз в 8 секунд, пока вкладка открыта
  usePolling(() => void fetchComments(true), 8_000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || submitting) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const newComment = await commentsApi.create(eventId, cleanText);
      setText('');
      setComments((prev) => [...prev, newComment]);
      setTimeout(() => {
        listBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setActionError(errorMessage(err, 'Не удалось отправить сообщение'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  const handleHide = async (commentId: number) => {
    try {
      const updated = await commentsApi.hide(eventId, commentId);
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
    } catch (err) {
      setActionError(errorMessage(err, 'Не удалось скрыть сообщение'));
    }
  };

  const canModerate = (c: EventComment) => {
    if (!currentUser) return false;
    return (
      currentUser.role === 'ROLE_ADMIN' ||
      currentUser.id === c.authorId ||
      isEventOrganizer
    );
  };

  return (
    <section className="bg-card rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm">
      {/* Шапка чата / обсуждения */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Обсуждение и вопросы
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {comments.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Чат с организатором и участниками мероприятия
            </p>
          </div>
        </div>

      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Список сообщений */}
      {loading ? (
        <LoadingBlock className="py-12" />
      ) : error ? (
        <div className="py-8 text-center text-sm text-red-600 bg-red-50 rounded-xl p-4">
          {error}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl mb-6">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            Пока нет вопросов и сообщений
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Будьте первым, кто уточнит условия у организатора (например: «Брать ли свои ракетки?»)
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-1">
          {comments.map((c) => {
            const isMine = currentUser?.id === c.authorId;
            return (
              <div
                key={c.id}
                className={`p-4 rounded-2xl border transition-all ${
                  c.hidden
                    ? 'bg-slate-50/60 border-slate-200 opacity-75'
                    : c.organizer
                    ? 'bg-brand-tint border-brand-line shadow-sm'
                    : isMine
                    ? 'bg-brand/5 border-brand/20'
                    : 'bg-card border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    {c.authorAvatarUrl ? (
                      <img
                        src={c.authorAvatarUrl}
                        alt={c.authorName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {c.authorName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {c.authorName}
                        </span>

                        {/* Яркий бейдж Организатора по ТЗ */}
                        {c.organizer && (
                          <span className="inline-flex items-center gap-1 text-caption font-extrabold uppercase tracking-wide bg-brand text-on-brand px-2 py-0.5 rounded-full shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Организатор
                          </span>
                        )}

                        {c.authorRole === 'ROLE_ADMIN' && !c.organizer && (
                          <span className="text-micro font-bold uppercase tracking-wide bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            Администратор
                          </span>
                        )}

                        {isMine && (
                          <span className="text-micro font-semibold text-slate-400">
                            (Вы)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-caption text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatDateTime(c.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {canModerate(c) && !c.hidden && (
                    <button
                      onClick={() => handleHide(c.id)}
                      title="Скрыть сообщение"
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition-colors text-xs flex items-center gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Скрыть</span>
                    </button>
                  )}
                </div>

                {/* Текст сообщения */}
                {c.hidden ? (
                  <p className="text-xs italic text-slate-500 pl-10 flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    Сообщение скрыто модератором
                  </p>
                ) : (
                  <p className="text-sm text-slate-800 whitespace-pre-wrap pl-10 leading-relaxed">
                    {c.text}
                  </p>
                )}
              </div>
            );
          })}
          <div ref={listBottomRef} />
        </div>
      )}

      {/* Форма отправки сообщения */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span>Вы пишете как:</span>
              <b className="text-slate-800">{currentUser.fullName}</b>
              {isEventOrganizer && (
                <span className="text-ink font-bold bg-brand-tint-2 px-1.5 py-0.2 rounded text-micro">
                  ✓ Организатор
                </span>
              )}
            </span>
            <span>{text.length} / 2000</span>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="Задайте вопрос организатору или напишите участникам (например: «Брать ли свои ракетки?»)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-sm p-3.5 border border-slate-300 rounded-2xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Enter — отправить, Shift+Enter — новая строка
            </span>

            <Button type="submit" disabled={!text.trim()} loading={submitting} className="ml-auto">
              {!submitting && <Send className="w-4 h-4" />}
              <span>{submitting ? 'Отправка...' : 'Отправить'}</span>
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-1">
            Хотите задать вопрос или пообщаться с участниками?
          </p>
          <p className="text-xs text-slate-500">
            Войдите в аккаунт или переключите демо-роль в шапке сайта, чтобы отправить сообщение.
          </p>
        </div>
      )}
    </section>
  );
};
