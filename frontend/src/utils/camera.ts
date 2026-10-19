/**
 * Камера для сканера билетов. Браузер даёт getUserMedia только на защищённой странице
 * (https:// или localhost): по http:// запрос разрешения даже не появляется.
 */

export type CameraProblem = 'insecure' | 'unsupported' | 'denied' | 'not-found' | 'busy' | 'unknown';

/** Можно ли вообще пытаться включить камеру на этой странице. */
export function cameraSupport(
  win: { isSecureContext?: boolean; navigator?: { mediaDevices?: { getUserMedia?: unknown } } } = window,
): 'ok' | 'insecure' | 'unsupported' {
  if (win.isSecureContext === false) return 'insecure';
  if (typeof win.navigator?.mediaDevices?.getUserMedia !== 'function') return 'unsupported';
  return 'ok';
}

/** html5-qrcode отдаёт ошибки строками вида «Error getting userMedia, error = NotAllowedError: …». */
export function classifyCameraError(error: unknown): CameraProblem {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/NotAllowedError|PermissionDenied|Permission denied|SecurityError/i.test(text)) return 'denied';
  if (/NotFoundError|DevicesNotFound|OverconstrainedError|Requested device not found/i.test(text)) return 'not-found';
  if (/NotReadableError|TrackStartError|Could not start video source|AbortError/i.test(text)) return 'busy';
  if (/secure context|https or localhost/i.test(text)) return 'insecure';
  if (/not supported|streaming not supported/i.test(text)) return 'unsupported';
  return 'unknown';
}

export const CAMERA_PROBLEM_MESSAGES: Record<CameraProblem, string> = {
  insecure:
    'Камера работает только на защищённой странице. Откройте сайт по адресу, начинающемуся с https://. Пока можно сфотографировать QR или ввести код вручную.',
  unsupported:
    'Этот браузер не даёт доступ к камере. Сфотографируйте QR кнопкой ниже или введите код вручную.',
  denied:
    'Доступ к камере запрещён. iPhone: «аА» в адресной строке → «Настройки веб-сайта» → «Камера» → «Разрешить» (или «Настройки → Safari → Камера»). Android: значок слева от адреса → «Разрешения» → «Камера». Затем обновите страницу.',
  'not-found': 'Камера не найдена на этом устройстве. Сфотографируйте QR другим устройством или введите код вручную.',
  busy: 'Камера занята другим приложением. Закройте его и попробуйте снова.',
  unknown: 'Не удалось включить камеру. Попробуйте ещё раз, сфотографируйте QR или введите код вручную.',
};

/** Код билета из содержимого QR: сам код или ссылка/текст, внутри которых он есть. */
export function extractTicketCode(raw: string): string {
  const clean = raw.trim().toUpperCase();
  return clean.match(/SPT-[A-Z0-9]{8}/)?.[0] ?? clean;
}

/**
 * Камера распознаёт QR много раз в секунду, пока он в кадре. Повтор того же кода
 * в течение окна игнорируем, иначе успешную отметку тут же сменит «Билет уже использован».
 */
export const REPEAT_SCAN_WINDOW_MS = 15000;

export function isRepeatScan(
  last: { code: string; at: number } | null,
  code: string,
  now: number,
  windowMs = REPEAT_SCAN_WINDOW_MS,
): boolean {
  return !!last && last.code === code && now - last.at < windowMs;
}
