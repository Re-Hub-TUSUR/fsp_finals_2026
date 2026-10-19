import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallAppBanner, OfflineBanner } from './PwaBanners';

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1';

function fireInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('InstallAppBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID_UA);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('без события установки на Android ничего не показывает', () => {
    render(<InstallAppBanner />);
    expect(screen.queryByRole('region', { name: 'Установка приложения' })).not.toBeInTheDocument();
  });

  it('по событию браузера предлагает установить и открывает системный диалог', async () => {
    const user = userEvent.setup();
    render(<InstallAppBanner />);
    const event = fireInstallPrompt('accepted');

    expect(event.defaultPrevented).toBe(true);
    await user.click(screen.getByRole('button', { name: /Установить/ }));

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('region', { name: 'Установка приложения' })).not.toBeInTheDocument();
  });

  it('если в системном диалоге отказались — не надоедаем две недели', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<InstallAppBanner />);
    fireInstallPrompt('dismissed');
    await user.click(screen.getByRole('button', { name: /Установить/ }));
    unmount();

    render(<InstallAppBanner />);
    fireInstallPrompt();
    expect(screen.queryByRole('region', { name: 'Установка приложения' })).not.toBeInTheDocument();
  });

  it('«Не сейчас» скрывает баннер и запоминает выбор', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<InstallAppBanner />);
    fireInstallPrompt();
    await user.click(screen.getByRole('button', { name: 'Не сейчас' }));
    expect(screen.queryByRole('region', { name: 'Установка приложения' })).not.toBeInTheDocument();
    unmount();

    render(<InstallAppBanner />);
    fireInstallPrompt();
    expect(screen.queryByRole('region', { name: 'Установка приложения' })).not.toBeInTheDocument();
  });

  it('на iPhone объясняет, как добавить на экран «Домой»', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_UA);
    render(<InstallAppBanner />);
    expect(screen.getByRole('region', { name: 'Установка приложения' })).toHaveTextContent('На экран „Домой“');
    expect(screen.queryByRole('button', { name: /Установить/ })).not.toBeInTheDocument();
  });

  it('в уже установленном приложении не показывается', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_UA);
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({ matches: true }),
      configurable: true,
    });
    render(<InstallAppBanner />);
    fireInstallPrompt();
    expect(screen.queryByRole('region', { name: 'Установка приложения' })).not.toBeInTheDocument();
  });

  it('после установки баннер исчезает', () => {
    render(<InstallAppBanner />);
    fireInstallPrompt();
    expect(screen.getByRole('region', { name: 'Установка приложения' })).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.queryByRole('region', { name: 'Установка приложения' })).not.toBeInTheDocument();
  });
});

describe('OfflineBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('в сети ничего не показывает и появляется при потере сети', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Нет сети');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('если приложение открыли уже без сети — плашка видна сразу', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent('Билеты доступны');
  });
});
