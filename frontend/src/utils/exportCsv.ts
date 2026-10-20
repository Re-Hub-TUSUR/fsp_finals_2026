import type { FieldDef, Participation, ParticipationStatus, SportEvent } from '../types';

export const STATUS_CSV_LABELS: Record<ParticipationStatus, string> = {
  CONFIRMED: 'Подтверждён',
  PENDING: 'Ожидает решения',
  WAITLISTED: 'В очереди',
  REJECTED: 'Отклонён',
  CANCELLED: 'Отменён',
};

/**
 * Экранирует значение ячейки для безопасного сохранения в CSV.
 * Для совместимости с Excel и русским языком:
 * - Если содержит точку с запятой, кавычки или перенос строки — оборачиваем в двойные кавычки.
 * - Внутренние двойные кавычки удваиваются (" -> "").
 * - Защищает от CSV formula injection.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  let str = String(value);
  // Защита от CSV formula injection в Excel (если строка начинается с =, +, @, tab или с минуса за которым следует буква/цифра)
  if (/^[=+@\t\r]|^-[a-zA-Z0-9]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Форматирует дату ISO в локализованную строку для отчёта (ДД.ММ.ГГГГ ЧЧ:ММ). */
export function formatIsoForCsv(iso?: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

/** Преобразует ответ на кастомный вопрос анкеты в читаемую строку. */
export function formatAnswerValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

/** Безопасное имя файла для экспорта. */
export function sanitizeFilename(title: string): string {
  const sanitized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized || 'meropriyatie';
}

/**
 * Генерирует CSV строку со всеми участниками события.
 * Использует UTF-8 BOM и разделитель точку с запятой (;) для нативного открытия в Excel.
 */
export function generateParticipantsCsv(
  event: SportEvent,
  participations: Participation[],
  filterStatus?: ParticipationStatus | 'ALL'
): string {
  const items =
    filterStatus && filterStatus !== 'ALL'
      ? participations.filter((p) => p.status === filterStatus)
      : participations;

  // Извлекаем все доступные поля анкеты из события
  const regFields: FieldDef[] =
    event.registrationFields && event.registrationFields.length > 0
      ? event.registrationFields
      : [];

  const headers = [
    '№',
    'ФИО участника',
    'Email',
    'Статус заявки',
    'Дата подачи заявки',
    'Код билета',
    'Отметка о явке',
    'Время отметки',
    'Сообщение участника',
    ...regFields.map((f) => f.label || f.key),
    'Комментарий организатора',
  ];

  const rows: string[][] = [headers];

  items.forEach((p, idx) => {
    const rowNum = String(idx + 1);
    const fullName = p.user?.fullName || 'Участник';
    const email = p.user?.email || '-';
    const status = STATUS_CSV_LABELS[p.status] || p.status;
    const createdAt = formatIsoForCsv(p.createdAt);
    const ticketCode = p.ticketCode || '-';
    const checkInStatus = p.checkedIn ? 'Явился' : 'Не явился';
    const checkInTime = p.checkedInAt ? formatIsoForCsv(p.checkedInAt) : '-';
    const message = p.message || '';

    // Значения анкеты
    const answerCols = regFields.map((f) => {
      const ans = p.answers ? p.answers[f.key] : undefined;
      return formatAnswerValue(ans);
    });

    const decisionComment = p.decisionComment || '';

    rows.push([
      rowNum,
      fullName,
      email,
      status,
      createdAt,
      ticketCode,
      checkInStatus,
      checkInTime,
      message,
      ...answerCols,
      decisionComment,
    ]);
  });

  // UTF-8 BOM + CSV с точкой с запятой
  const csvContent =
    '\uFEFF' +
    rows
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(';'))
      .join('\r\n');

  return csvContent;
}

/**
 * Скачивает CSV файл в браузере участника / организатора на клиенте.
 */
export function downloadParticipantsCsv(
  event: SportEvent,
  participations: Participation[],
  filterStatus?: ParticipationStatus | 'ALL'
): void {
  const csvContent = generateParticipantsCsv(event, participations, filterStatus);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `sportikus_uchastniki_${sanitizeFilename(event.title)}_${dateStr}.csv`;

  triggerBlobDownload(blob, filename);
}

/** Триггерит сохранение файла через скрытый <a> тег. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
