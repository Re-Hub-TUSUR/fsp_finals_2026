import { describe, expect, it } from 'vitest';
import { cameraSupport, classifyCameraError, extractTicketCode, isRepeatScan } from './camera';

describe('cameraSupport', () => {
  const getUserMedia = () => undefined;

  it('по http:// камеры нет, даже если API объявлено', () => {
    expect(cameraSupport({ isSecureContext: false, navigator: { mediaDevices: { getUserMedia } } })).toBe('insecure');
  });

  it('без mediaDevices — браузер не поддерживает камеру', () => {
    expect(cameraSupport({ isSecureContext: true, navigator: {} })).toBe('unsupported');
  });

  it('https:// и getUserMedia — можно включать', () => {
    expect(cameraSupport({ isSecureContext: true, navigator: { mediaDevices: { getUserMedia } } })).toBe('ok');
  });
});

describe('classifyCameraError', () => {
  it.each([
    ['Error getting userMedia, error = NotAllowedError: Permission denied', 'denied'],
    [new DOMException('Permission denied', 'NotAllowedError'), 'denied'],
    ['Error getting userMedia, error = NotFoundError: Requested device not found', 'not-found'],
    ['Error getting userMedia, error = NotReadableError: Could not start video source', 'busy'],
    ['Camera access is only supported in secure context like https or localhost.', 'insecure'],
    ['Camera streaming not supported by the browser.', 'unsupported'],
    ['something odd', 'unknown'],
  ])('%s → %s', (error, kind) => {
    expect(classifyCameraError(error)).toBe(kind);
  });
});

describe('extractTicketCode', () => {
  it('нормализует регистр и пробелы', () => {
    expect(extractTicketCode('  spt-a1b2c3d4 ')).toBe('SPT-A1B2C3D4');
  });

  it('достаёт код из ссылки или текста', () => {
    expect(extractTicketCode('https://example.ru/t/SPT-A1B2C3D4?x=1')).toBe('SPT-A1B2C3D4');
  });

  it('незнакомый формат отдаёт как есть, в верхнем регистре', () => {
    expect(extractTicketCode('abc')).toBe('ABC');
  });
});

describe('isRepeatScan', () => {
  it('первый скан не повтор', () => {
    expect(isRepeatScan(null, 'SPT-1', 0)).toBe(false);
  });

  it('тот же код внутри окна — повтор', () => {
    expect(isRepeatScan({ code: 'SPT-1', at: 1000 }, 'SPT-1', 5000, 15000)).toBe(true);
  });

  it('тот же код после окна — уже не повтор', () => {
    expect(isRepeatScan({ code: 'SPT-1', at: 1000 }, 'SPT-1', 17000, 15000)).toBe(false);
  });

  it('другой код — сразу обрабатывается', () => {
    expect(isRepeatScan({ code: 'SPT-1', at: 1000 }, 'SPT-2', 1001)).toBe(false);
  });
});
