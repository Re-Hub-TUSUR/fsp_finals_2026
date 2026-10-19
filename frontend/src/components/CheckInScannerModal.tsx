import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  QrCode,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { participationApi } from '../api';
import { errorMessage } from '../api/client';
import type { CheckInResult, Participation, SportEvent } from '../types';

interface CheckInScannerModalProps {
  event: SportEvent;
  confirmedParticipants: Participation[];
  onCheckInSuccess?: (result: CheckInResult) => void;
  onClose: () => void;
}

export const CheckInScannerModal: React.FC<CheckInScannerModalProps> = ({
  event,
  confirmedParticipants,
  onCheckInSuccess,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'html5-qr-reader';

  // Обработка кода билета (из камеры или ввода)
  const processTicketCode = async (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase();
    if (!clean || busy) return;

    setBusy(true);
    setResult(null);

    try {
      const res = await participationApi.checkIn(event.id, clean);
      setResult(res);
      if (res.success) {
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
      setBusy(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void processTicketCode(code);
  };

  // Запуск камеры
  const startCamera = async () => {
    setCameraError(null);
    try {
      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Найден QR код!
          void processTicketCode(decodedText);
        },
        () => {
          // Поиск кадра (игнорируем промежуточные кадры без QR)
        },
      );
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraError('Не удалось получить доступ к камере (проверьте разрешения или используйте ручной ввод)');
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Camera stop error:', err);
      }
    }
    scannerRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        void scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const checkedInCount = confirmedParticipants.filter((p) => p.checkedIn).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Шапка модалки */}
        <div className="bg-slate-900 text-snow p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/20 text-brand flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Контроль входа участников</h2>
              <p className="text-xs text-slate-400 truncate max-w-[300px]">{event.title}</p>
            </div>
          </div>
          <button
            onClick={() => {
              void stopCamera();
              onClose();
            }}
            aria-label="Закрыть"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Прогресс-бар чек-ина */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Отмечено на мероприятии:
          </span>
          <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-full border border-slate-200">
            {checkedInCount} / {confirmedParticipants.length} чел.
          </span>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Результат проверки билета */}
          {result && (
            <div
              className={`p-4 rounded-2xl border transition-all animate-in zoom-in-95 ${
                result.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : result.status === 'ALREADY_CHECKED_IN'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : result.status === 'ALREADY_CHECKED_IN' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-base leading-snug">
                    {result.success
                      ? 'Вход разрешён!'
                      : result.status === 'ALREADY_CHECKED_IN'
                      ? 'Билет уже использован!'
                      : 'Вход отклонён!'}
                  </h3>
                  <p className="text-xs mt-1">{result.message}</p>

                  {result.participant && (
                    <div className="mt-3 pt-3 border-t border-black/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {result.participant.avatarUrl ? (
                          <img
                            src={result.participant.avatarUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : null}
                        <b className="font-semibold">{result.participant.fullName}</b>
                      </div>
                      <code className="font-mono text-[11px] bg-white/70 px-2 py-0.5 rounded">
                        {result.ticketCode}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Видоискатель камеры */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Сканирование камерой
              </span>
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  cameraActive
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-brand/10 text-brand hover:bg-brand/20'
                }`}
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" /> Выключить камеру
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" /> Включить камеру
                  </>
                )}
              </button>
            </div>

            <div
              id={readerElementId}
              className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 min-h-[220px] flex items-center justify-center text-slate-400 text-xs ${
                cameraActive ? 'block' : 'hidden'
              }`}
            />

            {!cameraActive && (
              <div
                onClick={startCamera}
                className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-brand/40 bg-slate-50 hover:bg-slate-100/70 rounded-2xl p-6 text-center transition"
              >
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Нажмите, чтобы включить камеру</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Наведите объектив на QR-код участника
                </p>
              </div>
            )}

            {cameraError && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                {cameraError}
              </p>
            )}
          </div>

          {/* Ручной ввод кода */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Или введите код билета вручную
            </span>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Например: SPT-A1B2C3D4"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1 text-sm p-3 border border-slate-300 rounded-xl font-mono uppercase outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="bg-brand hover:bg-brand-hover text-on-brand font-semibold text-xs px-4 rounded-xl disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Проверить'}
              </button>
            </form>
          </div>

          {/* Быстрый выбор подтверждённых участников */}
          {confirmedParticipants.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Список подтверждённых участников ({confirmedParticipants.length})
              </span>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {confirmedParticipants.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                      p.checkedIn
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-white border-slate-200 hover:border-brand/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {p.user?.avatarUrl ? (
                        <img
                          src={p.user.avatarUrl}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {p.user?.fullName?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <span className="font-semibold truncate">{p.user?.fullName}</span>
                      {p.ticketCode && (
                        <code className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          {p.ticketCode}
                        </code>
                      )}
                    </div>

                    {p.checkedIn ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Вход подтверждён
                      </span>
                    ) : (
                      <button
                        onClick={() => p.ticketCode && processTicketCode(p.ticketCode)}
                        disabled={busy}
                        className="text-xs bg-brand/10 hover:bg-brand text-brand hover:text-on-brand font-semibold px-2.5 py-1 rounded-lg transition shrink-0"
                      >
                        Отметить вход
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
