import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, QrCode as QrIcon, Send, Share2 } from 'lucide-react';
import type { SportEvent } from '../types';
import { formatDateTime } from '../utils/format';
import { Modal } from './Modal';

interface ShareEventModalProps {
  event: SportEvent;
  open: boolean;
  onClose: () => void;
}

export const ShareEventModal: React.FC<ShareEventModalProps> = ({ event, open, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const eventUrl = `${window.location.origin}/events/${event.id}`;
  const when = formatDateTime(event.startTime, event.timeZone);
  const shareText = `🏃 Го со мной на «${event.title}» (${event.sport.name})!\n📅 ${when}\n📍 ${event.address}\nПрисоединяйся: ${eventUrl}`;

  useEffect(() => {
    if (open) {
      setCopied(false);
      setShowQr(false);
      QRCode.toDataURL(eventUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#1b1d1f',
          light: '#ffffff',
        },
      })
        .then(setQrUrl)
        .catch(() => setQrUrl(null));
    }
  }, [open, eventUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const shareTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(
      `🏃 Го со мной на «${event.title}» (${event.sport.name})!\n📅 ${when}\n📍 ${event.address}`
    )}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const shareVk = () => {
    const vkUrl = `https://vk.com/share.php?url=${encodeURIComponent(eventUrl)}&title=${encodeURIComponent(
      `Спортивное событие: ${event.title}`
    )}`;
    window.open(vkUrl, '_blank', 'noopener,noreferrer');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: eventUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      void copyToClipboard();
    }
  };

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      title="Поделиться событием"
    >
      <div className="space-y-4">
        {/* Кнопки соцсетей */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={shareTelegram}
            className="p-3.5 rounded-2xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] border border-[#229ED9]/30 font-bold text-sm flex items-center justify-center gap-2.5 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>В Telegram</span>
          </button>

          <button
            type="button"
            onClick={shareVk}
            className="p-3.5 rounded-2xl bg-[#0077FF]/10 hover:bg-[#0077FF]/20 text-[#0077FF] border border-[#0077FF]/30 font-bold text-sm flex items-center justify-center gap-2.5 transition-colors"
          >
            <span className="font-extrabold text-base">VK</span>
            <span>ВКонтакте</span>
          </button>
        </div>

        {/* Копирование ссылки */}
        <div className="p-3 rounded-2xl bg-surface border border-line-2 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={eventUrl}
            className="flex-1 bg-transparent text-xs font-mono text-muted outline-none select-all truncate"
          />
          <button
            type="button"
            onClick={copyToClipboard}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-card border border-line-2 text-ink hover:bg-surface-2'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
          </button>
        </div>

        {/* Дополнительные опции: Нативный шеринг и QR код */}
        <div className="flex gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={shareNative}
              className="flex-1 p-2.5 rounded-xl border border-line-2 text-xs font-bold text-ink hover:bg-surface transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Ещё варианты</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className="flex-1 p-2.5 rounded-xl border border-line-2 text-xs font-bold text-ink hover:bg-surface transition-colors flex items-center justify-center gap-2"
          >
            <QrIcon className="w-4 h-4" />
            <span>{showQr ? 'Скрыть QR' : 'Показать QR-код'}</span>
          </button>
        </div>

        {/* QR-код события */}
        {showQr && qrUrl && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center animate-in fade-in duration-200">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Отсканируйте камерой смартфона, чтобы открыть событие:
            </p>
            <img src={qrUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg shadow-sm" />
          </div>
        )}
      </div>
    </Modal>
  );
};
