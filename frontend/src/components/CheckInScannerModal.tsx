import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  CameraOff,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { participationApi } from '../api';
import { errorMessage } from '../api/client';
import type { CheckInResult, SportEvent } from '../types';
import {
  CAMERA_PROBLEM_MESSAGES,
  cameraSupport,
  classifyCameraError,
  extractTicketCode,
  isRepeatScan,
} from '../utils/camera';

interface CheckInScannerModalProps {
  event: SportEvent;
  onCheckInSuccess?: (result: CheckInResult) => void;
  onClose: () => void;
}

/** Уголки рамки сканирования (как в системной камере). */
const FrameCorners: React.FC = () => (
  <>
    <span className="absolute left-0 top-0 w-11 h-11 border-l-[3px] border-t-[3px] border-white rounded-tl-[22px]" />
    <span className="absolute right-0 top-0 w-11 h-11 border-r-[3px] border-t-[3px] border-white rounded-tr-[22px]" />
    <span className="absolute left-0 bottom-0 w-11 h-11 border-l-[3px] border-b-[3px] border-white rounded-bl-[22px]" />
    <span className="absolute right-0 bottom-0 w-11 h-11 border-r-[3px] border-b-[3px] border-white rounded-br-[22px]" />
  </>
);

const roundButton =
  'w-[52px] h-[52px] shrink-0 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md text-white flex items-center justify-center transition-colors hover:bg-white/25 disabled:opacity-60 disabled:hover:bg-white/15';

/**
 * Контроль входа: камера на весь экран с рамкой, распознавание QR с фото, фонарик,
 * снизу — счётчик отмеченных и ручной ввод кода билета.
 */
export const CheckInScannerModal: React.FC<CheckInScannerModalProps> = ({ event, onCheckInSuccess, onClose }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [counts, setCounts] = useState<{ checked: number; total: number } | null>(null);
  // Проверяем сразу при открытии: по http:// камеры нет, и организатор должен узнать это до клика
  const [support] = useState(() => cameraSupport());

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Колбэк камеры живёт с момента запуска, поэтому «занято» и последний код храним в ref, а не в state
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const readerElementId = 'html5-qr-reader';
  const photoElementId = 'html5-qr-photo';

  // Сколько подтверждённых уже прошли; без прав на список — хотя бы общее число участников
  useEffect(() => {
    participationApi
      .forEvent(event.id)
      .then((list) => {
        const confirmed = list.filter((p) => p.status === 'CONFIRMED');
        setCounts({ checked: confirmed.filter((p) => p.checkedIn).length, total: confirmed.length });
      })
      .catch(() => setCounts({ checked: 0, total: event.confirmedCount }));
  }, [event.id, event.confirmedCount]);

  // Обработка кода билета (из камеры, фото или ввода)
  const processTicketCode = async (rawCode: string) => {
    const clean = extractTicketCode(rawCode);
    if (!clean || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setResult(null);

    try {
      const res = await participationApi.checkIn(event.id, clean);
      setResult(res);
      navigator.vibrate?.(res.success ? 80 : [60, 40, 60]);
      if (res.success) {
        setCounts((c) => (c ? { ...c, checked: Math.min(c.total, c.checked + 1) } : c));
        setCode('');
        onCheckInSuccess?.(res);
      }
    } catch (err) {
      setResult({
        success: false,
        status: 'NOT_FOUND',
        message: errorMessage(err, 'Не удалось проверить билет'),
        ticketCode: clean,
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleScan = (decodedText: string) => {
    const scanned = extractTicketCode(decodedText);
    const now = Date.now();
    if (busyRef.current || isRepeatScan(lastScanRef.current, scanned, now)) return;
    lastScanRef.current = { code: scanned, at: now };
    void processTicketCode(scanned);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void processTicketCode(code);
  };

  const startCamera = async () => {
    if (cameraActive || cameraStarting) return;
    setCameraError(null);
    if (support !== 'ok') {
      setCameraError(CAMERA_PROBLEM_MESSAGES[support]);
      return;
    }
    // html5-qrcode берёт ширину видео из ширины контейнера в момент запуска — он должен быть уже отрисован
    flushSync(() => setCameraStarting(true));
    try {
      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;
      // Без qrbox распознаётся весь кадр, а рамку рисуем сами — так QR находится, даже если он не по центру
      await html5QrCode.start({ facingMode: 'environment' }, { fps: 10 }, handleScan, () => {
        // Кадр без QR — ждём следующий
      });
      setCameraActive(true);
      try {
        setTorchSupported(html5QrCode.getRunningTrackCameraCapabilities().torchFeature().isSupported());
      } catch {
        setTorchSupported(false);
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      scannerRef.current = null;
      setCameraError(CAMERA_PROBLEM_MESSAGES[classifyCameraError(err)]);
      setCameraActive(false);
    } finally {
      setCameraStarting(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Camera stop error:', err);
      }
    }
    scannerRef.current = null;
    setCameraActive(false);
    setTorchOn(false);
    setTorchSupported(false);
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner?.isScanning) return;
    try {
      await scanner.getRunningTrackCameraCapabilities().torchFeature().apply(!torchOn);
      setTorchOn(!torchOn);
    } catch {
      setCameraError('Не удалось включить фонарик на этом устройстве');
    }
  };

  // Распознавание QR с фото: из галереи или системной камерой. Работает и без https
  const scanPhoto = async (file: File) => {
    setCameraError(null);
    setPhotoBusy(true);
    if (scannerRef.current?.isScanning) await stopCamera();
    const reader = new Html5Qrcode(photoElementId);
    try {
      const text = await reader.scanFile(file, false);
      await processTicketCode(text);
    } catch {
      setCameraError('На фото не найден QR-код. Сфотографируйте его крупнее, без бликов, или введите код вручную.');
    } finally {
      try {
        reader.clear();
      } catch {
        // нечего очищать
      }
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const close = () => {
    void stopCamera();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (scannerRef.current?.isScanning) void scannerRef.current.stop().catch(() => {});
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Камеру отпускаем при любом закрытии окна, в том числе при уходе со страницы
  useEffect(
    () => () => {
      if (scannerRef.current?.isScanning) void scannerRef.current.stop().catch(() => {});
    },
    [],
  );

  const frameMessage = cameraStarting
    ? 'Включаем камеру…'
    : support !== 'ok'
      ? 'Камера недоступна'
      : 'Камера выключена';

  return (
    <div className="fixed inset-0 z-[2100] bg-black/70 flex sm:items-center sm:justify-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-title"
        className="relative w-full h-dvh sm:h-[min(860px,calc(100dvh-2rem))] sm:max-w-[440px] sm:rounded-[32px] overflow-hidden bg-[#1c1d20] flex flex-col shadow-2xl"
      >
        {/* Камера на весь экран; без неё — тёмная «шахматка» */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="absolute inset-0 overflow-hidden">
            <div id={readerElementId} className="scanner-reader w-full h-full" />
          </div>
          {!cameraActive && (
            <div aria-hidden="true" className="scanner-idle absolute inset-0" />
          )}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

          <header className="relative px-6 pt-[max(1.75rem,env(safe-area-inset-top))] pr-20">
            <h2 id="checkin-title" className="text-[32px] font-extrabold leading-[1.08] tracking-[-0.02em] text-white">
              Контроль входа участников
            </h2>
            <p className="mt-3 text-sm font-medium text-white/85 line-clamp-2">{event.title}</p>
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть"
              className="absolute right-5 top-[max(1.75rem,env(safe-area-inset-top))] w-11 h-11 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2.4} />
            </button>
          </header>

          {/* Рамка сканирования */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center px-6">
            <div className="relative w-60 h-60 max-w-[70vw] max-h-[70vw] flex flex-col items-center justify-center text-center">
              <FrameCorners />
              {!cameraActive && (
                <>
                  <span className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                    {cameraStarting ? <Loader2 className="w-7 h-7 animate-spin" /> : <CameraOff className="w-7 h-7" />}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-white">{frameMessage}</p>
                </>
              )}
            </div>
          </div>

          {(support !== 'ok' || cameraError) && (
            <p
              role={cameraError ? 'alert' : 'status'}
              className="relative mx-6 mb-3 rounded-xl bg-black/55 backdrop-blur-md px-3.5 py-2.5 text-xs leading-snug text-white"
            >
              {cameraError ?? CAMERA_PROBLEM_MESSAGES[support as Exclude<typeof support, 'ok'>]}
            </p>
          )}

          {/* Кнопки: фото с QR, включение камеры, фонарик */}
          <div className="relative flex items-center gap-3 px-6 pb-12">
            <div id={photoElementId} className="hidden" />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Фото QR-кода"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void scanPhoto(file);
              }}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoBusy || busy}
              aria-label="Распознать QR с фото"
              title="Распознать QR с фото"
              className={roundButton}
            >
              {photoBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
            </button>

            {!cameraActive && support === 'ok' ? (
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={cameraStarting}
                className="flex-1 h-[52px] rounded-2xl bg-brand text-on-brand text-[17px] font-bold hover:bg-brand-hover transition-colors disabled:opacity-70"
              >
                Включить камеру
              </button>
            ) : (
              <span className="flex-1" />
            )}

            <button
              type="button"
              onClick={() => void toggleTorch()}
              disabled={!cameraActive || !torchSupported}
              aria-label={torchOn ? 'Выключить фонарик' : 'Включить фонарик'}
              aria-pressed={torchOn}
              title={cameraActive && !torchSupported ? 'Фонарик недоступен на этом устройстве' : 'Фонарик'}
              className={roundButton}
            >
              {torchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Нижний лист: результат, счётчик, ручной ввод */}
        <div className="scanner-sheet relative -mt-7 rounded-t-[28px] bg-card px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {result && (
            <div
              className={`mb-4 p-3.5 rounded-2xl border ${
                result.success
                  ? 'bg-brand-tint border-brand-line text-ink'
                  : result.status === 'ALREADY_CHECKED_IN'
                    ? 'bg-warn-tint border-transparent text-warn-ink'
                    : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-6 h-6 text-brand-ink shrink-0" />
                ) : result.status === 'ALREADY_CHECKED_IN' ? (
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold leading-snug">
                    {result.success
                      ? 'Вход разрешён!'
                      : result.status === 'ALREADY_CHECKED_IN'
                        ? 'Билет уже использован!'
                        : 'Вход отклонён!'}
                  </h3>
                  <p className="text-xs mt-0.5">{result.message}</p>
                  {result.participant && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 min-w-0">
                        {result.participant.avatarUrl && (
                          <img src={result.participant.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        )}
                        <b className="font-semibold truncate">{result.participant.fullName}</b>
                      </span>
                      <code className="font-mono text-[11px] shrink-0">{result.ticketCode}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-3 text-[15px] leading-tight text-muted">
              <Users className="w-7 h-7 shrink-0 text-brand-ink" strokeWidth={1.8} />
              <span className="max-w-[9rem]">Отмечено на мероприятии</span>
            </span>
            <span className="text-[26px] font-extrabold tracking-[-0.01em] text-ink whitespace-nowrap" aria-live="polite">
              {counts ? `${counts.checked} / ${counts.total}` : '…'} чел.
            </span>
          </div>

          <div className="my-5 border-t border-line" />

          <form onSubmit={handleManualSubmit}>
            <label htmlFor="checkin-code" className="block text-[17px] font-bold text-ink mb-3">
              Или введите код билета вручную
            </label>
            <div className="flex gap-3">
              <input
                id="checkin-code"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="SPT-A1B2C3D4"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1 min-w-0 h-14 px-4 rounded-2xl border border-brand-line bg-card text-base font-mono uppercase text-ink placeholder:text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="shrink-0 h-14 px-6 rounded-2xl bg-brand text-on-brand text-base font-bold hover:bg-brand-hover transition-colors disabled:bg-surface-2 disabled:text-muted flex items-center gap-2"
              >
                {busy && code.trim() ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Проверить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
