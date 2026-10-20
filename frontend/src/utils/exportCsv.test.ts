import { describe, expect, it, vi } from 'vitest';
import {
  escapeCsvCell,
  formatIsoForCsv,
  formatAnswerValue,
  sanitizeFilename,
  generateParticipantsCsv,
  downloadParticipantsCsv,
} from './exportCsv';
import type { Participation, SportEvent } from '../types';

describe('exportCsv utility', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('returns normal string as is', () => {
      expect(escapeCsvCell('Иван Иванов')).toBe('Иван Иванов');
      expect(escapeCsvCell(42)).toBe('42');
      expect(escapeCsvCell('-')).toBe('-');
    });

    it('wraps string with semicolon in quotes', () => {
      expect(escapeCsvCell('Футбол; Волейбол')).toBe('"Футбол; Волейбол"');
    });

    it('doubles quotes and wraps in quotes when quotes are present', () => {
      expect(escapeCsvCell('Команда "Спартак"')).toBe('"Команда ""Спартак"""');
    });

    it('wraps strings with newlines in quotes', () => {
      expect(escapeCsvCell("Строка 1\nСтрока 2")).toBe("\"Строка 1\nСтрока 2\"");
    });

    it('protects against formula injection by prefixing apostrophe', () => {
      expect(escapeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(escapeCsvCell('+12345')).toBe("'+12345");
      expect(escapeCsvCell('-cmd|calc')).toBe("'-cmd|calc");
      expect(escapeCsvCell('@test')).toBe("'@test");
    });
  });

  describe('formatIsoForCsv', () => {
    it('returns "-" for empty or undefined', () => {
      expect(formatIsoForCsv(undefined)).toBe('-');
      expect(formatIsoForCsv('')).toBe('-');
    });

    it('formats valid date correctly', () => {
      const formatted = formatIsoForCsv('2026-05-15T14:30:00Z');
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    });

    it('returns "-" for invalid date string', () => {
      expect(formatIsoForCsv('not-a-date')).toBe('-');
    });
  });

  describe('formatAnswerValue', () => {
    it('formats booleans as Да / Нет', () => {
      expect(formatAnswerValue(true)).toBe('Да');
      expect(formatAnswerValue(false)).toBe('Нет');
    });

    it('formats arrays as comma-separated values', () => {
      expect(formatAnswerValue(['Вратарь', 'Нападающий'])).toBe('Вратарь, Нападающий');
    });

    it('returns empty string for null or undefined', () => {
      expect(formatAnswerValue(null)).toBe('');
      expect(formatAnswerValue(undefined)).toBe('');
    });

    it('stringifies numbers and strings', () => {
      expect(formatAnswerValue(10)).toBe('10');
      expect(formatAnswerValue('L')).toBe('L');
    });
  });

  describe('sanitizeFilename', () => {
    it('replaces special characters and spaces with underscores', () => {
      expect(sanitizeFilename('Турнир по футболу 2026!')).toBe('турнир_по_футболу_2026');
      expect(sanitizeFilename('   Event #42   ')).toBe('event_42');
    });

    it('falls back to meropriyatie if empty', () => {
      expect(sanitizeFilename('???')).toBe('meropriyatie');
    });
  });

  describe('generateParticipantsCsv', () => {
    const mockEvent: SportEvent = {
      id: 10,
      title: 'Большой турнир по футболу',
      sport: { id: 1, name: 'Футбол', slug: 'football', custom: false },
      organizerName: 'Алексей Орг',
      byOrganization: false,
      startTime: '2026-06-01T10:00:00Z',
      endTime: '2026-06-01T12:00:00Z',
      lat: 55.75,
      lng: 37.61,
      address: 'Москва, Лужники',
      capacity: 20,
      confirmedCount: 1,
      joinMode: 'APPROVAL',
      skillLevel: 'AMATEUR',
      status: 'PUBLISHED',
      registrationFields: [
        { key: 'role', label: 'Позиция на поле', type: 'SELECT', required: true },
        { key: 'size', label: 'Размер формы', type: 'TEXT', required: false },
      ],
    };

    const mockParticipations: Participation[] = [
      {
        id: 101,
        status: 'CONFIRMED',
        message: 'Хочу играть',
        ticketCode: 'TCK-101-ABCD',
        checkedIn: true,
        checkedInAt: '2026-06-01T09:45:00Z',
        createdAt: '2026-05-20T10:00:00Z',
        user: { id: 1, fullName: 'Иван Иванов', email: 'ivan@example.com' },
        answers: { role: 'Вратарь', size: 'XL' },
        decisionComment: 'Принят!',
      },
      {
        id: 102,
        status: 'PENDING',
        message: 'Буду рад сыграть',
        ticketCode: undefined,
        checkedIn: false,
        createdAt: '2026-05-21T11:00:00Z',
        user: { id: 2, fullName: 'Петр Петров', email: 'petr@example.com' },
        answers: { role: 'Нападающий' },
      },
      {
        id: 103,
        status: 'WAITLISTED',
        createdAt: '2026-05-22T12:00:00Z',
        user: { id: 3, fullName: 'Сергей Сидоров' },
      },
    ];

    it('generates CSV starting with UTF-8 BOM', () => {
      const csv = generateParticipantsCsv(mockEvent, mockParticipations);
      expect(csv.startsWith('\uFEFF')).toBe(true);
    });

    it('includes headers and all participant rows', () => {
      const csv = generateParticipantsCsv(mockEvent, mockParticipations);
      expect(csv).toContain('№;ФИО участника;Email;Статус заявки;Дата подачи заявки;Код билета;Отметка о явке;Время отметки;Сообщение участника;Позиция на поле;Размер формы;Комментарий организатора');
      expect(csv).toContain('1;Иван Иванов;ivan@example.com;Подтверждён');
      expect(csv).toContain('TCK-101-ABCD;Явился');
      expect(csv).toContain('Вратарь;XL;Принят!');
      expect(csv).toContain('2;Петр Петров;petr@example.com;Ожидает решения');
      expect(csv).toContain('3;Сергей Сидоров;-;В очереди');
    });

    it('filters participants by status when specified', () => {
      const csv = generateParticipantsCsv(mockEvent, mockParticipations, 'CONFIRMED');
      expect(csv).toContain('Иван Иванов');
      expect(csv).not.toContain('Петр Петров');
      expect(csv).not.toContain('Сергей Сидоров');
    });
  });

  describe('downloadParticipantsCsv and triggerBlobDownload', () => {
    it('creates a download link and triggers click', () => {
      const mockEvent: SportEvent = {
        id: 1,
        title: 'Тест',
        sport: { id: 1, name: 'Бег', slug: 'running', custom: false },
        organizerName: 'Орг',
        byOrganization: false,
        startTime: '2026-06-01T10:00:00Z',
        endTime: '2026-06-01T12:00:00Z',
        lat: 0,
        lng: 0,
        address: 'Тест',
        capacity: 10,
        confirmedCount: 0,
        joinMode: 'OPEN',
        skillLevel: 'ANY',
        status: 'PUBLISHED',
      };

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
      global.URL.revokeObjectURL = vi.fn();

      downloadParticipantsCsv(mockEvent, []);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });
});
