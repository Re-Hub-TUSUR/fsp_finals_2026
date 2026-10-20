import type {
  CreateEventPayload,
  CustomField,
  EventTemplate,
  FieldDef,
  FieldValues,
  JoinMode,
  OrgDetails,
  SkillLevel,
  Sport,
} from '../../types';
import { firstNumberError, pruneValues } from '../../components/FieldInput';
import { toLocalInput, zonedLocalToIso } from '../../utils/format';

/** Всё, что вводит автор в конструкторе мероприятия (кроме точки на карте — её ведёт useVenueLocation). */
export interface EventForm {
  template: EventTemplate | null;
  title: string;
  description: string;
  sportId: number | '';
  customSport: boolean;
  customSportName: string;
  /** Локальное время места проведения в формате datetime-local. */
  start: string;
  end: string;
  recurrenceRule: 'NONE' | 'CUSTOM';
  recurrenceIntervalDays: number;
  address: string;
  capacity: number;
  joinMode: JoinMode;
  skillLevel: SkillLevel;
  price: string;
  deadline: string;
  minAge: string;
  maxAge: string;
  equipment: string;
  details: FieldValues;
  customFields: CustomField[];
  questions: FieldDef[];
  orgDetails: OrgDetails;
}

export type EventFormAction =
  | { type: 'update'; patch: Partial<EventForm> }
  /** Смена начала сдвигает окончание на длительность выбранного формата. */
  | { type: 'start'; value: string }
  /** Выбор формата подставляет его значения по умолчанию и предлагаемый вид спорта. */
  | { type: 'template'; template: EventTemplate; sports: Sport[] };

const HOUR = 3_600_000;

function plusMinutes(localInput: string, minutes: number): string | null {
  const date = new Date(localInput);
  return Number.isNaN(date.getTime()) ? null : toLocalInput(new Date(date.getTime() + minutes * 60_000));
}

/** Начало по умолчанию — через два часа, ровно в начале часа. */
export function initialEventForm(now = new Date()): EventForm {
  const start = new Date(now);
  start.setHours(start.getHours() + 2, 0, 0, 0);
  return {
    template: null,
    title: '',
    description: '',
    sportId: '',
    customSport: false,
    customSportName: '',
    start: toLocalInput(start),
    end: toLocalInput(new Date(start.getTime() + 2 * HOUR)),
    recurrenceRule: 'NONE',
    recurrenceIntervalDays: 7,
    address: '',
    capacity: 10,
    joinMode: 'APPROVAL',
    skillLevel: 'ANY',
    price: '',
    deadline: '',
    minAge: '',
    maxAge: '',
    equipment: '',
    details: {},
    customFields: [],
    questions: [],
    orgDetails: {},
  };
}

export function eventFormReducer(form: EventForm, action: EventFormAction): EventForm {
  switch (action.type) {
    case 'update':
      return { ...form, ...action.patch };
    case 'start': {
      const end = form.template ? plusMinutes(action.value, form.template.defaultDurationMinutes) : null;
      return { ...form, start: action.value, end: end ?? form.end };
    }
    case 'template': {
      const t = action.template;
      const suggested = action.sports.find((s) => s.slug === t.suggestedSportSlug);
      return {
        ...form,
        template: t,
        details: {},
        questions: t.registrationFields.map((q) => ({ ...q })),
        capacity: t.defaultCapacity,
        joinMode: t.defaultJoinMode,
        skillLevel: t.defaultSkillLevel,
        end: plusMinutes(form.start, t.defaultDurationMinutes) ?? form.end,
        ...(suggested ? { sportId: suggested.id, customSport: false } : {}),
      };
    }
  }
}

/** Первая ошибка заполнения, которую стоит показать автору, или null. */
export function validateEventForm(form: EventForm, zone: string | undefined): string | null {
  const { template } = form;
  if (!template) return 'Выберите формат мероприятия';
  if (!zonedLocalToIso(form.start, zone) || !zonedLocalToIso(form.end, zone)) return 'Укажите дату и время начала и окончания';
  if (!form.customSport && form.sportId === '') return 'Выберите вид спорта или введите свой';
  if (form.customSport && !form.customSportName.trim()) return 'Введите название вида спорта';

  for (const f of template.fields) {
    const v = form.details[f.key];
    if (f.required && (v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || v === false)) {
      return `Заполните поле «${f.label}»`;
    }
  }
  const numberProblem = firstNumberError(template.fields, form.details);
  if (numberProblem) return numberProblem;

  for (const q of form.questions.filter((q) => q.label.trim())) {
    if (q.type === 'NUMBER' && q.max !== undefined && q.max < (q.min ?? 0)) {
      return `У вопроса «${q.label}» максимум меньше минимума`;
    }
    if ((q.type === 'SELECT' || q.type === 'MULTISELECT') && !(q.options && q.options.length)) {
      return `У вопроса «${q.label}» нужно указать варианты ответа`;
    }
  }
  return null;
}

const optionalNumber = (value: string) => (value ? Number(value) : undefined);

/** Запрос на создание из проверенной формы: обрезка пробелов, пустые поля и вопросы отбрасываются. */
export function buildEventPayload(
  form: EventForm,
  { coords, zone, asOrganization }: { coords: [number, number]; zone: string | undefined; asOrganization: boolean },
): CreateEventPayload {
  const { template, orgDetails } = form;
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    sportId: form.customSport ? undefined : Number(form.sportId),
    customSportName: form.customSport ? form.customSportName.trim() : undefined,
    templateId: template!.id,
    startTime: zonedLocalToIso(form.start, zone)!,
    endTime: zonedLocalToIso(form.end, zone)!,
    recurrenceRule: form.recurrenceRule,
    recurrenceIntervalDays: form.recurrenceRule === 'CUSTOM' ? form.recurrenceIntervalDays : undefined,
    lat: coords[0],
    lng: coords[1],
    address: form.address.trim(),
    capacity: form.capacity,
    joinMode: form.joinMode,
    skillLevel: form.skillLevel,
    requiredEquipment: form.equipment.trim() || undefined,
    price: optionalNumber(form.price),
    registrationDeadline: zonedLocalToIso(form.deadline, zone),
    minAge: optionalNumber(form.minAge),
    maxAge: optionalNumber(form.maxAge),
    details: pruneValues(form.details),
    customFields: form.customFields
      .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
      .filter((f) => f.label && f.value),
    registrationFields: form.questions
      .filter((q) => q.label.trim())
      .map((q) => ({
        ...q,
        label: q.label.trim(),
        options: q.type === 'SELECT' || q.type === 'MULTISELECT' ? q.options : undefined,
      })),
    orgDetails: asOrganization
      ? {
          ...orgDetails,
          program: (orgDetails.program ?? []).filter((p) => p.title.trim()),
          medicalCertificateRequired: orgDetails.medicalCertificateRequired === true,
          insuranceRequired: orgDetails.insuranceRequired === true,
        }
      : undefined,
  };
}
