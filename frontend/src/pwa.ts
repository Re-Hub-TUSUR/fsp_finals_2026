/**
 * PWA: регистрация service worker (public/sw.js) и очистка сохранённых для офлайна личных данных.
 * Service worker работает только на защищённой странице с доверенным сертификатом (или localhost).
 */

/** Префикс кэша, в котором service worker хранит ответы личного кабинета (билеты, мои события). */
export const PERSONAL_CACHE_PREFIX = 'sportikus-api';

export function registerServiceWorker(enabled: boolean = import.meta.env.PROD): void {
  if (!enabled || !('serviceWorker' in navigator)) return;
  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => console.warn('Service worker не зарегистрирован:', error));
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Событие Chrome/Edge, позволяющее показать системный диалог установки в нужный момент. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Приложение уже открыто как установленное (с главного экрана). */
export function isStandalone(win: Window = window): boolean {
  return (
    win.matchMedia?.('(display-mode: standalone)').matches === true ||
    (win.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone и iPad: системного диалога установки нет, только «Поделиться → На экран „Домой“». */
export function isIos(userAgent: string = navigator.userAgent): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

const INSTALL_DISMISS_KEY = 'sportikus-install-dismissed-at';
export const INSTALL_DISMISS_DAYS = 14;

export function installDismissedRecently(now: number = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(INSTALL_DISMISS_KEY));
    return !!at && now - at < INSTALL_DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

export function rememberInstallDismissed(now: number = Date.now()): void {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(now));
  } catch {
    // приватный режим — баннер просто покажется снова
  }
}

/** При смене аккаунта офлайн-копии прежнего пользователя не должны остаться на устройстве. */
export async function clearPersonalOfflineData(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(PERSONAL_CACHE_PREFIX)).map((key) => caches.delete(key)));
  } catch {
    // хранилище недоступно (приватный режим) — чистить нечего
  }
}
