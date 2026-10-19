import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckInResult, SportEvent } from '../types';
import { participationApi } from '../api';
import { CheckInScannerModal } from './CheckInScannerModal';

const scanner = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  scanFile: vi.fn(),
  isScanning: false,
  onScan: null as ((text: string) => void) | null,
}));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn(() => scanner),
}));

vi.mock('../api', () => ({
  participationApi: { checkIn: vi.fn() },
}));

const EVENT = {
  id: 7,
  title: 'Дворовый футбол',
  sport: { id: 1, name: 'Футбол', slug: 'futbol', custom: false },
  organizerName: 'Иван',
  byOrganization: false,
  startTime: '2026-10-20T12:00:00Z',
  endTime: '2026-10-20T14:00:00Z',
  lat: 56,
  lng: 92,
  address: 'ул. Ленина, 1',
  capacity: 10,
  confirmedCount: 1,
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

function setSecureContext(secure: boolean, withCamera = true) {
  Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
  Object.defineProperty(navigator, 'mediaDevices', {
    value: withCamera ? { getUserMedia: vi.fn() } : undefined,
    configurable: true,
  });
}

const renderModal = () =>
  render(<CheckInScannerModal event={EVENT} confirmedParticipants={[]} onClose={vi.fn()} />);

describe('CheckInScannerModal', () => {
  beforeEach(() => {
    scanner.isScanning = false;
    scanner.onScan = null;
    scanner.start.mockReset().mockImplementation(async (_camera, _config, onScan: (text: string) => void) => {
      scanner.isScanning = true;
      scanner.onScan = onScan;
    });
    scanner.stop.mockReset().mockResolvedValue(undefined);
    scanner.clear.mockReset();
    scanner.scanFile.mockReset();
    vi.mocked(participationApi.checkIn).mockReset().mockResolvedValue(SUCCESS);
    setSecureContext(true);
  });

  afterEach(() => {
    setSecureContext(true);
  });

  it('по http:// сразу объясняет, что камера требует https, и оставляет фото и ввод кода', () => {
    setSecureContext(false);
    renderModal();

    expect(screen.getByRole('status')).toHaveTextContent('Камера работает только на защищённой странице');
    expect(screen.queryByText('Включить камеру')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сфотографировать QR/ })).toBeEnabled();
    expect(screen.getByPlaceholderText(/SPT-A1B2C3D4/)).toBeInTheDocument();
  });

  it('без поддержки камеры в браузере предлагает запасные пути', () => {
    setSecureContext(true, false);
    renderModal();
    expect(screen.getByRole('status')).toHaveTextContent('не даёт доступ к камере');
  });

  it('один QR в кадре отмечает вход ровно один раз и не перекрывает успех «уже использован»', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Нажмите, чтобы включить камеру/ }));
    expect(scanner.start).toHaveBeenCalledTimes(1);

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
    await user.click(screen.getByRole('button', { name: /Нажмите, чтобы включить камеру/ }));

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

  it('запрет доступа к камере объясняет, где его включить', async () => {
    const user = userEvent.setup();
    scanner.start.mockRejectedValue('Error getting userMedia, error = NotAllowedError: Permission denied');
    renderModal();

    await user.click(screen.getByRole('button', { name: /Нажмите, чтобы включить камеру/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Доступ к камере запрещён');
    expect(alert).toHaveTextContent('Настройки веб-сайта');
  });

  it('камера занята другим приложением — отдельное сообщение', async () => {
    const user = userEvent.setup();
    scanner.start.mockRejectedValue('Error getting userMedia, error = NotReadableError: Could not start video source');
    renderModal();

    await user.click(screen.getByRole('button', { name: /Нажмите, чтобы включить камеру/ }));
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

  it('ручной ввод кода по-прежнему работает', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText(/SPT-A1B2C3D4/), 'spt-a1b2c3d4');
    await user.click(screen.getByRole('button', { name: 'Проверить' }));

    await waitFor(() => expect(participationApi.checkIn).toHaveBeenCalledWith(7, 'SPT-A1B2C3D4'));
  });
});
