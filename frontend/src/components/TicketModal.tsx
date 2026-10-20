import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  MapPin,
  QrCode,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import type { SportEvent } from '../types';
import { formatDateTime } from '../utils/format';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface TicketModalProps {
  event: SportEvent;
  ticketCode: string;
  participantName: string;
  participantAvatar?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  event,
  ticketCode,
  participantName,
  participantAvatar,
  checkedIn,
  checkedInAt,
  onClose,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, onClose);

  useEffect(() => {
    QRCode.toDataURL(ticketCode, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(setQrUrl)
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [ticketCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPaid = event.price !== undefined && event.price !== null && event.price > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-title"
        className="anim-drop outline-none relative w-full max-w-md bg-card rounded-3xl shadow-2xl overflow-hidden border border-line"
      >
        {/* Верхняя декоративная плашка билета */}
        <div className="bg-brand text-on-brand p-6 relative">
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-on-brand/15 hover:bg-on-brand/25 text-on-brand flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-caption font-extrabold uppercase tracking-wider bg-on-brand/15 px-2.5 py-0.5 rounded-full">
              <Ticket className="w-3.5 h-3.5" /> Электронный билет
            </span>
            {isPaid ? (
              <span className="text-caption font-bold bg-on-brand text-brand px-2 py-0.5 rounded-full">
                Оплачено: {event.price} ₽
              </span>
            ) : (
              <span className="text-caption font-bold bg-on-brand text-brand px-2 py-0.5 rounded-full">
                Бесплатный вход
              </span>
            )}
          </div>

          <h2 id="ticket-title" className="text-xl font-extrabold leading-snug drop-shadow-sm">{event.title}</h2>
          <p className="text-xs text-on-brand/80 mt-1 flex items-center gap-1.5">
            <span>Организатор:</span>
            <b>{event.organizerName}</b>
          </p>
        </div>

        {/* Тело билета */}
        <div className="p-6 space-y-5">
          {/* Статус проверки на входе */}
          {checkedIn ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-brand-tint border border-brand-line text-ink">
              <CheckCircle2 className="w-5 h-5 text-brand-ink shrink-0" />
              <div className="text-xs">
                <p className="font-bold">Вход на мероприятие подтверждён!</p>
                <p className="text-muted">Билет проверен организатором {checkedInAt ? `(${checkedInAt.slice(11, 16)})` : ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line text-ink">
              <Sparkles className="w-5 h-5 text-brand-ink shrink-0" />
              <p className="text-xs">
                Покажите этот QR-код организатору на входе для допуска на мероприятие.
              </p>
            </div>
          )}

          {/* QR код */}
          <div className="flex flex-col items-center justify-center p-4 bg-surface rounded-2xl border border-line">
            {qrUrl ? (
              <div className="relative p-2 bg-snow rounded-2xl shadow-sm border border-line">
                <img src={qrUrl} alt={`QR код билета ${ticketCode}`} className="w-56 h-56 object-contain" />
                {checkedIn && (
                  <div className="absolute inset-0 bg-snow/85 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-2xl">
                    <CheckCircle2 className="w-14 h-14 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800 mt-2 uppercase tracking-wide">
                      Использован
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
            )}

            {/* Код билета с кнопкой копирования */}
            <div className="mt-3 flex items-center gap-2">
              <code className="text-base font-extrabold tracking-wider text-ink bg-card px-3 py-1 rounded-lg border border-line font-mono">
                {ticketCode}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                title="Скопировать код"
                aria-label="Скопировать код"
                className="p-1.5 rounded-lg bg-card border border-line hover:bg-surface text-muted transition"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-brand-ink" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Информация об участнике и событии */}
          <div className="space-y-2.5 text-xs text-muted bg-surface p-3.5 rounded-2xl border border-line">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Участник:</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                {participantAvatar ? (
                  <img src={participantAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : null}
                <span>{participantName}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Дата и время:
              </span>
              <b className="text-slate-900">{formatDateTime(event.startTime, event.timeZone)}</b>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1 shrink-0">
                <MapPin className="w-3.5 h-3.5" /> Место сбора:
              </span>
              <span className="text-right text-slate-800 font-medium truncate max-w-[200px]">
                {event.address}
              </span>
            </div>
          </div>

          {/* Кнопка закрытия / печати */}
          <div className="flex gap-2">
            {qrUrl && (
              <a
                href={qrUrl}
                download={`ticket-${ticketCode}.png`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-surface hover:bg-surface-2 text-ink py-3 rounded-xl font-semibold text-xs transition"
              >
                <Download className="w-4 h-4" /> Сохранить QR
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-ink hover:opacity-90 text-page py-3 rounded-xl font-semibold text-xs transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
