import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckInResult, Participation, SportEvent } from '../types';
import { participationApi } from '../api';
import { CheckInScannerModal } from './CheckInScannerModal';

const scanner = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  scanFile: vi.fn(),
  torchApply: vi.fn(),
  torchSupported: true,
  isScanning: false,
  onScan: null as ((text: string) => void) | null,
}));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn(() => ({
    start: scanner.start,
    stop: scanner.stop,
    clear: scanner.clear,
    scanFile: scanner.scanFile,
    get isScanning() {
      return scanner.isScanning;
    },
    getRunningTrackCameraCapabilities: () => ({
      torchFeature: () => ({ isSupported: () => scanner.torchSupported, apply: scanner.torchApply, value: () => null }),
    }),
  })),
}));

vi.mock('../api', () => ({
  participationApi: { checkIn: vi.fn(), forEvent: vi.fn() },
}));

const EVENT = {
  id: 7,
  title: 'Открытый турнир по волейболу «Кубок Енисея»',
  sport: { id: 1, name: 'Волейбол', slug: 'volejbol', custom: false },
  organizerName: 'СК «Енисей»',
  byOrganization: true,
  startTime: '2026-10-20T12:00:00Z',
  endTime: '2026-10-20T14:00:00Z',
  lat: 56,
  lng: 92,
  address: 'ул. Ленина, 1',
  capacity: 20,
  confirmedCount: 10,
  joinMode: 'OPEN',
  skillLevel: 'ANY',
  status: 'PUBLISHED',
} as SportEvent;

const SUCCESS: CheckInResult = {
  success: true,
  status: 'SUCCESS',
  message: 'Участник подтверждён и допущен на мероприятие!',
  ticketCode: 'SPT-A1B2C3D4',
  participant: { id: 2, fullName: 'Ольга Новичкова' },
};

const participation = (id: number, status: Participation['status'], checkedIn = false) =>
  ({ id, status, checkedIn, createdAt: '' }) as Participation;

function setSecureContext(secure: boolean, withCamera = true) {
  Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
  Object.defineProperty(navigator, 'mediaDevices', {
    value: withCamera ? { getUserMedia: vi.fn() } : undefined,
    configurable: true,
  });
}

const renderModal = (onClose = vi.fn()) => {
  render(<CheckInScannerModal event={EVENT} onClose={onClose} />);
  return { onClose };
};

const startButton = () => screen.getByRole('button', { name: 'Включить камеру' });

describe('CheckInScannerModal', () => {
  beforeEach(() => {
    scanner.isScanning = false;
    scanner.onScan = null;
    scanner.torchSupported = true;
    scanner.start.mockReset().mockImplementation(async (_camera, _config, onScan: (text: string) => void) => {
      scanner.isScanning = true;
      scanner.onScan = onScan;
    });
    scanner.stop.mockReset().mockImplementation(async () => {
      scanner.isScanning = false;
    });
    scanner.clear.mockReset();
    scanner.scanFile.mockReset();
    scanner.torchApply.mockReset().mockResolvedValue(undefined);
    vi.mocked(participationApi.checkIn).mockReset().mockResolvedValue(SUCCESS);
    vi.mocked(participationApi.forEvent)
      .mockReset()
      .mockResolvedValue([
        participation(1, 'CONFIRMED', true),
        participation(2, 'CONFIRMED'),
        participation(3, 'CONFIRMED'),
        participation(4, 'PENDING'),
      ]);
    setSecureContext(true);
  });

  afterEach(() => {
    setSecureContext(true);
  });

  it('показывает заголовок, мероприятие и выключенную камеру', async () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'Контроль входа участников' })).toBeInTheDocument();
    expect(screen.getByText(EVENT.title)).toBeInTheDocument();
    expect(screen.getByText('Камера выключена')).toBeInTheDocument();
    expect(startButton()).toBeEnabled();
    expect(await screen.findByText('1 / 3 чел.')).toBeInTheDocument();
  });

  it('считает отмеченных среди подтверждённых и прибавляет после успешной отметки', async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByText('1 / 3 чел.');

    await user.type(screen.getByLabelText('Или введите код билета вручную'), 'spt-a1b2c3d4');
    await user.click(screen.getByRole('button', { name: 'Проверить' }));

    expect(await screen.findByText('2 / 3 чел.')).toBeInTheDocument();
    expect(screen.getByLabelText('Или введите код билета вручную')).toHaveValue('');
  });

  it('без прав на список участников показывает общее число подтверждённых', async () => {
    vi.mocked(participationApi.forEvent).mockRejectedValue(new Error('403'));
    renderModal();
    expect(await screen.findByText('0 / 10 чел.')).toBeInTheDocument();
  });

  it('по http:// объясняет, что камера требует https, и оставляет фото и ввод кода', () => {
    setSecureContext(false);
    renderModal();

    expect(screen.getByRole('status')).toHaveTextContent('Камера работает только на защищённой странице');
    expect(screen.getByText('Камера недоступна')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Включить камеру' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Распознать QR с фото' })).toBeEnabled();
    expect(screen.getByLabelText('Или введите код билета вручную')).toBeInTheDocument();
  });

  it('без поддержки камеры в браузере предлагает запасные пути', () => {
    setSecureContext(true, false);
    renderModal();
    expect(screen.getByRole('status')).toHaveTextContent('не даёт доступ к камере');
  });

  it('контейнер камеры уже отрисован в момент запуска — иначе видео получает ширину 0', async () => {
    const user = userEvent.setup();
    let readerConnected = false;
    scanner.start.mockImplementation(async (_camera, _config, onScan: (text: string) => void) => {
      readerConnected = document.getElementById('html5-qr-reader')?.isConnected ?? false;
      scanner.isScanning = true;
      scanner.onScan = onScan;
    });
    renderModal();

    await user.click(startButton());

    expect(scanner.start).toHaveBeenCalledTimes(1);
    expect(readerConnected).toBe(true);
    expect(screen.queryByText('Камера выключена')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Включить камеру' })).not.toBeInTheDocument();
  });

  it('один QR в кадре отмечает вход ровно один раз и не перекрывает успех «уже использован»', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(startButton());

    await act(async () => {
      for (let i = 0; i < 5; i++) scanner.onScan?.('SPT-A1B2C3D4');
    });
    expect(await screen.findByText('Вход разрешён!')).toBeInTheDocument();
    await act(async () => {
      for (let i = 0; i < 5; i++) scanner.onScan?.('spt-a1b2c3d4');
    });

    expect(participationApi.checkIn).toHaveBeenCalledTimes(1);
    expect(participationApi.checkIn).toHaveBeenCalledWith(7, 'SPT-A1B2C3D4');
    expect(screen.queryByText('Билет уже использован!')).not.toBeInTheDocument();
  });

  it('следующий участник с другим кодом обрабатывается сразу', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(startButton());

    await act(async () => {
      scanner.onScan?.('SPT-A1B2C3D4');
    });
    await waitFor(() => expect(participationApi.checkIn).toHaveBeenCalledTimes(1));
    await act(async () => {
      scanner.onScan?.('SPT-ZZZZ9999');
    });
    await waitFor(() => expect(participationApi.checkIn).toHaveBeenCalledTimes(2));
    expect(participationApi.checkIn).toHaveBeenLastCalledWith(7, 'SPT-ZZZZ9999');
  });

  it('фонарик доступен только при включённой камере и переключается', async () => {
    const user = userEvent.setup();
    renderModal();
    const torch = screen.getByRole('button', { name: 'Включить фонарик' });
    expect(torch).toBeDisabled();

    await user.click(startButton());
    expect(torch).toBeEnabled();
    await user.click(torch);

    expect(scanner.torchApply).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Выключить фонарик' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('если фонарика нет — кнопка остаётся неактивной', async () => {
    const user = userEvent.setup();
    scanner.torchSupported = false;
    renderModal();
    await user.click(startButton());
    expect(screen.getByRole('button', { name: 'Включить фонарик' })).toBeDisabled();
  });

  it('запрет доступа к камере объясняет, где его включить', async () => {
    const user = userEvent.setup();
    scanner.start.mockRejectedValue('Error getting userMedia, error = NotAllowedError: Permission denied');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderModal();

    await user.click(startButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Доступ к камере запрещён');
    expect(alert).toHaveTextContent('Настройки веб-сайта');
    expect(startButton()).toBeEnabled();
  });

  it('камера занята другим приложением — отдельное сообщение', async () => {
    const user = userEvent.setup();
    scanner.start.mockRejectedValue('Error getting userMedia, error = NotReadableError: Could not start video source');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderModal();

    await user.click(startButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Камера занята другим приложением');
  });

  it('фото с QR отмечает вход — работает и без https', async () => {
    setSecureContext(false);
    const user = userEvent.setup();
    scanner.scanFile.mockResolvedValue(' spt-a1b2c3d4 ');
    renderModal();

    await user.upload(screen.getByLabelText('Фото QR-кода'), new File(['x'], 'qr.jpg', { type: 'image/jpeg' }));

    await waitFor(() => expect(participationApi.checkIn).toHaveBeenCalledWith(7, 'SPT-A1B2C3D4'));
    expect(await screen.findByText('Вход разрешён!')).toBeInTheDocument();
  });

  it('фото без QR — подсказка переснять или ввести код', async () => {
    const user = userEvent.setup();
    scanner.scanFile.mockRejectedValue('No MultiFormat Readers were able to detect the code.');
    renderModal();

    await user.upload(screen.getByLabelText('Фото QR-кода'), new File(['x'], 'qr.jpg', { type: 'image/jpeg' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('На фото не найден QR-код');
    expect(participationApi.checkIn).not.toHaveBeenCalled();
  });

  it('«Проверить» неактивна без кода', async () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Проверить' })).toBeDisabled();
  });

  it('закрытие крестиком и Escape останавливает камеру', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(startButton());

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(scanner.stop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
