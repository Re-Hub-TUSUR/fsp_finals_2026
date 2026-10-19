import React, { useEffect, useState } from 'react';
import { Download, Share, WifiOff, X } from 'lucide-react';
import {
  type BeforeInstallPromptEvent,
  installDismissedRecently,
  isIos,
  isStandalone,
  rememberInstallDismissed,
} from '../pwa';

/**
 * Предложение установить приложение: в Chrome/Edge — системный диалог по кнопке,
 * на iPhone — подсказка, как добавить на экран «Домой». Не показывается в установленном приложении
 * и две недели после «Не сейчас».
 */
export const InstallAppBanner: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isStandalone() || installDismissedRecently());
  const [iosHint] = useState(() => isIos() && !isStandalone());

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setHidden(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || (!promptEvent && !iosHint)) return null;

  const dismiss = () => {
    rememberInstallDismissed();
    setHidden(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    if (outcome === 'dismissed') dismiss();
    else setHidden(true);
  };

  return (
    <div
      role="region"
      aria-label="Установка приложения"
      className="shrink-0 border-t border-line bg-card px-3 py-2.5 flex items-center gap-3 max-w-full"
    >
      <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold text-ink leading-tight">Установите Sportikus</p>
        {promptEvent ? (
          <p className="text-muted text-xs leading-snug">Билеты будут под рукой даже без интернета</p>
        ) : (
          <p className="text-muted text-xs leading-snug">
            Нажмите <Share className="inline w-3.5 h-3.5 -mt-0.5" aria-label="Поделиться" /> «Поделиться», затем
            «На экран „Домой“»
          </p>
        )}
      </div>
      {promptEvent && (
        <button
          type="button"
          onClick={() => void install()}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hover transition-colors"
        >
          <Download className="w-4 h-4" /> Установить
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Не сейчас"
        className="shrink-0 w-9 h-9 rounded-xl text-muted hover:bg-surface flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/** Тонкая плашка без сети: приложение работает на сохранённых данных. */
export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="shrink-0 bg-ink text-white text-xs font-semibold px-3 py-1.5 flex items-center justify-center gap-2 text-center"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      Нет сети — показываем сохранённые данные. Билеты доступны в «Моих событиях».
    </div>
  );
};
