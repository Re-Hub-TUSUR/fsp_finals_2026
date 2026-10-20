import { describe, expect, it } from 'vitest';
import type { EventTemplate, Sport } from '../../types';
import { buildEventPayload, eventFormReducer, initialEventForm, validateEventForm, type EventForm } from './eventForm';

const TEMPLATE: EventTemplate = {
  id: 3,
  code: 'run',
  name: 'Пробежка',
  icon: '🏃',
  organizationOnly: false,
  defaultCapacity: 25,
  defaultJoinMode: 'OPEN',
  defaultSkillLevel: 'NOVICE',
  defaultDurationMinutes: 90,
  suggestedSportSlug: 'running',
  fields: [{ key: 'distance', label: 'Дистанция', type: 'NUMBER', required: true, min: 1 }],
  registrationFields: [{ key: 'q1', label: 'Ваш темп?', type: 'TEXT', required: false }],
} as EventTemplate;

const SPORTS: Sport[] = [{ id: 9, name: 'Бег', slug: 'running', custom: false }];

function withTemplate(): EventForm {
  return eventFormReducer(initialEventForm(new Date('2030-05-01T08:15:00')), { type: 'template', template: TEMPLATE, sports: SPORTS });
}

describe('eventFormReducer', () => {
  it('starts two hours ahead on the hour', () => {
    const form = initialEventForm(new Date('2030-05-01T08:15:00'));
    expect(form.start).toBe('2030-05-01T10:00');
    expect(form.end).toBe('2030-05-01T12:00');
  });

  it('applies template defaults, its questions and suggested sport', () => {
    const form = withTemplate();
    expect(form).toMatchObject({ capacity: 25, joinMode: 'OPEN', skillLevel: 'NOVICE', sportId: 9, end: '2030-05-01T11:30' });
    expect(form.questions).toEqual(TEMPLATE.registrationFields);
    expect(form.questions[0]).not.toBe(TEMPLATE.registrationFields[0]);
  });

  it('moves the end with the start by the template duration', () => {
    const form = eventFormReducer(withTemplate(), { type: 'start', value: '2030-05-02T18:00' });
    expect(form.end).toBe('2030-05-02T19:30');
  });
});

describe('validateEventForm', () => {
  it('requires the template fields', () => {
    expect(validateEventForm(withTemplate(), undefined)).toBe('Заполните поле «Дистанция»');
  });

  it('asks for answer options in choice questions', () => {
    const form = {
      ...withTemplate(),
      details: { distance: 5 },
      questions: [{ key: 'q', label: 'Размер футболки', type: 'SELECT' as const, required: false }],
    };
    expect(validateEventForm(form, undefined)).toBe('У вопроса «Размер футболки» нужно указать варианты ответа');
  });

  it('passes a complete form', () => {
    expect(validateEventForm({ ...withTemplate(), title: 'Утренний бег', details: { distance: 5 } }, undefined)).toBeNull();
  });
});

describe('buildEventPayload', () => {
  it('trims text, drops empty extras and keeps organizer details only for organizations', () => {
    const form: EventForm = {
      ...withTemplate(),
      title: '  Утренний бег ',
      address: ' Набережная ',
      price: '',
      minAge: '14',
      details: { distance: 5 },
      customFields: [
        { label: ' Парковка ', value: ' есть ' },
        { label: '', value: 'пусто' },
      ],
      questions: [
        { key: 'a', label: '  ', type: 'TEXT', required: false },
        { key: 'b', label: ' Темп ', type: 'TEXT', required: false, options: ['x'] },
      ],
      orgDetails: { program: [{ title: ' ' }, { title: 'Старт' }] },
    };
    const payload = buildEventPayload(form, { coords: [56, 92.9], zone: undefined, asOrganization: false });
    expect(payload).toMatchObject({ title: 'Утренний бег', address: 'Набережная', price: undefined, minAge: 14, lat: 56, lng: 92.9 });
    expect(payload.customFields).toEqual([{ label: 'Парковка', value: 'есть' }]);
    expect(payload.registrationFields).toEqual([{ key: 'b', label: 'Темп', type: 'TEXT', required: false, options: undefined }]);
    expect(payload.orgDetails).toBeUndefined();

    const org = buildEventPayload(form, { coords: [56, 92.9], zone: undefined, asOrganization: true });
    expect(org.orgDetails).toMatchObject({ program: [{ title: 'Старт' }], medicalCertificateRequired: false, insuranceRequired: false });
  });
});
