import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INSTALL_DISMISS_DAYS,
  clearPersonalOfflineData,
  installDismissedRecently,
  isIos,
  isStandalone,
  registerServiceWorker,
  rememberInstallDismissed,
} from './pwa';

describe('registerServiceWorker', () => {
  const register = vi.fn();

  beforeEach(() => {
    register.mockReset().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('в режиме разработки не регистрирует — иначе мешал бы горячей перезагрузке Vite', () => {
    registerServiceWorker(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('в сборке регистрирует /sw.js', () => {
    registerServiceWorker(true);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('ошибка регистрации (например, недоверенный сертификат) не роняет приложение', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    register.mockRejectedValue(new Error('SSL certificate error'));
    registerServiceWorker(true);
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});

describe('clearPersonalOfflineData', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'caches');
  });

  it('удаляет только кэш личных данных, оболочку приложения оставляет', async () => {
    const remove = vi.fn().mockResolvedValue(true);
    Object.defineProperty(globalThis, 'caches', {
      value: { keys: vi.fn().mockResolvedValue(['sportikus-shell-v1', 'sportikus-api-v1', 'other']), delete: remove },
      configurable: true,
    });

    await clearPersonalOfflineData();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('sportikus-api-v1');
  });

  it('без Cache Storage просто ничего не делает', async () => {
    await expect(clearPersonalOfflineData()).resolves.toBeUndefined();
  });
});

describe('isStandalone / isIos', () => {
  it('режим standalone определяется по display-mode', () => {
    const win = { matchMedia: () => ({ matches: true }), navigator: {} } as unknown as Window;
    expect(isStandalone(win)).toBe(true);
  });

  it('на iPhone — по navigator.standalone', () => {
    const win = { navigator: { standalone: true } } as unknown as Window;
    expect(isStandalone(win)).toBe(true);
  });

  it('обычная вкладка — не standalone', () => {
    const win = { matchMedia: () => ({ matches: false }), navigator: {} } as unknown as Window;
    expect(isStandalone(win)).toBe(false);
  });

  it('распознаёт iPhone и не путает с Android', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIos('Mozilla/5.0 (Linux; Android 14; SM-S918B)')).toBe(false);
  });
});

describe('отказ от установки', () => {
  beforeEach(() => localStorage.clear());

  it(`помнится ${INSTALL_DISMISS_DAYS} дней, потом баннер можно показать снова`, () => {
    const now = Date.UTC(2026, 9, 20);
    expect(installDismissedRecently(now)).toBe(false);
    rememberInstallDismissed(now);
    expect(installDismissedRecently(now + 86400000)).toBe(true);
    expect(installDismissedRecently(now + (INSTALL_DISMISS_DAYS + 1) * 86400000)).toBe(false);
  });
});
