import React, { useEffect, useState } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Верхняя декоративная плашка билета */}
        <div className="bg-gradient-to-r from-brand via-brand-dark to-slate-900 text-snow p-6 relative">
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
              <Ticket className="w-3.5 h-3.5" /> Электронный билет
            </span>
            {isPaid ? (
              <span className="text-[11px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                Оплачено: {event.price} ₽
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                Бесплатный вход
              </span>
            )}
          </div>

          <h2 className="text-xl font-extrabold leading-snug drop-shadow-sm">{event.title}</h2>
          <p className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
            <span>Организатор:</span>
            <b>{event.organizerName}</b>
          </p>
        </div>

        {/* Тело билета */}
        <div className="p-6 space-y-5">
          {/* Статус проверки на входе */}
          {checkedIn ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold">Вход на мероприятие подтверждён!</p>
                <p className="text-emerald-700">Билет проверен организатором {checkedInAt ? `(${checkedInAt.slice(11, 16)})` : ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700">
              <Sparkles className="w-5 h-5 text-brand shrink-0" />
              <p className="text-xs">
                Покажите этот QR-код организатору на входе для допуска на мероприятие.
              </p>
            </div>
          )}

          {/* QR код */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
            {qrUrl ? (
              <div className="relative p-2 bg-white rounded-2xl shadow-sm border border-slate-200">
                <img src={qrUrl} alt={`QR код билета ${ticketCode}`} className="w-56 h-56 object-contain" />
                {checkedIn && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-2xl">
                    <CheckCircle2 className="w-14 h-14 text-emerald-600 animate-in zoom-in" />
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
              <code className="text-base font-extrabold tracking-wider text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200 font-mono">
                {ticketCode}
              </code>
              <button
                onClick={handleCopy}
                title="Скопировать код"
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Информация об участнике и событии */}
          <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
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
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-xs transition"
              >
                <Download className="w-4 h-4" /> Сохранить QR
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-snow py-3 rounded-xl font-semibold text-xs transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
