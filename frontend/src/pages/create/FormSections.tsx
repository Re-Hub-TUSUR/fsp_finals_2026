import React from 'react';
import type { City, EventTemplate, JoinMode, SkillLevel, Sport } from '../../types';
import { inputClass, labelClass } from '../../components/ui';
import { LocationPicker } from '../../components/LocationPicker';
import { JOIN_MODE_LABELS, SKILL_LABELS, utcLabel } from '../../utils/format';
import type { EventForm } from './eventForm';
import type { AddressSearch } from './useVenueLocation';

export interface SectionProps {
  form: EventForm;
  update: (patch: Partial<EventForm>) => void;
}

const Required = () => <span className="text-red-500">*</span>;

const choiceClass = (active: boolean) =>
  `rounded-xl border p-3.5 transition-all ${
    active ? 'border-brand bg-brand-tint ring-2 ring-brand/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
  }`;

/** Нумерованный шаг конструктора. */
export const FormSection: React.FC<{ n: number; title: string; hint?: string; children: React.ReactNode }> = ({
  n,
  title,
  hint,
  children,
}) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
    <div className="flex items-start gap-3 mb-4">
      <span className="w-8 h-8 shrink-0 rounded-full bg-brand text-on-brand font-bold flex items-center justify-center text-sm">{n}</span>
      <div>
        <h2 className="text-lg font-bold text-slate-900 leading-tight">{title}</h2>
        {hint && <p className="text-sm text-slate-500 mt-0.5">{hint}</p>}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

export const TemplatePicker: React.FC<{
  templates: EventTemplate[];
  selected: EventTemplate | null;
  onSelect: (template: EventTemplate) => void;
}> = ({ templates, selected, onSelect }) => (
  <FormSection n={1} title="Формат мероприятия" hint="От формата зависят дополнительные поля и вопросы участникам.">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {templates.map((t) => {
        const active = selected?.id === t.id;
        return (
          <button type="button" key={t.id} onClick={() => onSelect(t)} aria-pressed={active} className={`text-left ${choiceClass(active)}`}>
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="text-xl">{t.icon}</span>
              {t.name}
              {t.organizationOnly && (
                <span className="text-micro uppercase tracking-wide bg-slate-900 text-white px-1.5 py-0.5 rounded">для организаций</span>
              )}
            </div>
            {t.description && <p className="text-sm text-slate-500 mt-1">{t.description}</p>}
          </button>
        );
      })}
    </div>
  </FormSection>
);

export const BasicsSection: React.FC<SectionProps & { sports: Sport[] }> = ({ form, update, sports }) => (
  <FormSection n={2} title="Основное">
    <div>
      <label htmlFor="ev-title" className={labelClass}>
        Название <Required />
      </label>
      <input
        id="ev-title"
        type="text"
        required
        maxLength={150}
        placeholder="Например: Воркаут на набережной"
        value={form.title}
        onChange={(e) => update({ title: e.target.value })}
        className={inputClass}
      />
    </div>

    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor="ev-sport" className="text-sm font-semibold text-slate-700">
          Вид спорта / активности <Required />
        </label>
        <button
          type="button"
          onClick={() => update({ customSport: !form.customSport })}
          className="text-sm text-brand-ink hover:text-brand-ink font-semibold"
        >
          {form.customSport ? '← Выбрать из списка' : '+ Свой вид спорта'}
        </button>
      </div>
      {form.customSport ? (
        <input
          id="ev-sport"
          type="text"
          maxLength={60}
          placeholder="Например: Петанк, Падел, Скандинавская ходьба"
          value={form.customSportName}
          onChange={(e) => update({ customSportName: e.target.value })}
          className={`${inputClass} border-brand-line`}
        />
      ) : (
        <select
          id="ev-sport"
          value={form.sportId}
          onChange={(e) => update({ sportId: e.target.value ? Number(e.target.value) : '' })}
          className={inputClass}
        >
          <option value="">— выберите —</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
    </div>

    <div>
      <label htmlFor="ev-desc" className={labelClass}>
        Описание
      </label>
      <textarea
        id="ev-desc"
        rows={4}
        maxLength={5000}
        placeholder="Опишите формат встречи, план и что важно знать участникам"
        value={form.description}
        onChange={(e) => update({ description: e.target.value })}
        className={inputClass}
      />
    </div>
  </FormSection>
);

const ADDRESS_HINTS: Record<AddressSearch, string> = {
  idle: '',
  loading: 'Ищем адрес на карте…',
  found: 'Точка найдена и отмечена на карте.',
  missing: 'Адрес не найден — уточните его или выберите точку на карте.',
};

export const ScheduleSection: React.FC<
  SectionProps & {
    onStartChange: (value: string) => void;
    coords: [number, number];
    onPick: (lat: number, lng: number) => void;
    venueCity: City | null;
    addressSearch: AddressSearch;
  }
> = ({ form, update, onStartChange, coords, onPick, venueCity, addressSearch }) => (
  <FormSection n={3} title="Когда и где" hint="Точку сбора можно выбрать кликом по карте.">
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="ev-start" className={labelClass}>
          Начало <Required />
        </label>
        <input
          id="ev-start"
          type="datetime-local"
          required
          value={form.start}
          onChange={(e) => onStartChange(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="ev-end" className={labelClass}>
          Окончание <Required />
        </label>
        <input
          id="ev-end"
          type="datetime-local"
          required
          value={form.end}
          min={form.start}
          onChange={(e) => update({ end: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
    <div>
      <span className={labelClass}>Повторение</span>
      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.recurrenceRule === 'CUSTOM'}
            onChange={(e) => update({ recurrenceRule: e.target.checked ? 'CUSTOM' : 'NONE' })}
            className="h-5 w-5 accent-brand"
          />
          <span>
            <b className="block text-slate-900">Повторять событие</b>
            <span className="text-sm text-slate-500">Следующее событие создастся после завершения текущего</span>
          </span>
        </label>
        {form.recurrenceRule === 'CUSTOM' && (
          <label htmlFor="ev-recurrence-days" className="mt-4 block text-sm font-semibold text-slate-700">
            Повторять через
            <span className="mt-1 flex max-w-xs items-center gap-2">
              <input
                id="ev-recurrence-days"
                type="number"
                required
                min={1}
                max={365}
                value={form.recurrenceIntervalDays}
                onChange={(e) => update({ recurrenceIntervalDays: Number(e.target.value) })}
                className={inputClass}
              />
              <span className="whitespace-nowrap font-normal text-slate-600">дней</span>
            </span>
          </label>
        )}
      </div>
    </div>
    <div>
      <label htmlFor="ev-address" className={labelClass}>
        Адрес места сбора <Required />
      </label>
      <input
        id="ev-address"
        type="text"
        required
        maxLength={300}
        placeholder="Красноярск, остров Татышев, павильон"
        value={form.address}
        onChange={(e) => update({ address: e.target.value })}
        className={inputClass}
      />
      <p className="mt-1 text-xs text-slate-500" aria-live="polite">
        {ADDRESS_HINTS[addressSearch]}
      </p>
    </div>
    <LocationPicker lat={coords[0]} lng={coords[1]} onChange={onPick} />
    <p className="text-xs text-slate-500">
      Координаты: {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
      {venueCity && ` · ${venueCity.name}`}
    </p>
    {venueCity && (
      <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        Время начала и окончания указывается по местному времени места проведения:{' '}
        <b>
          {venueCity.name} ({utcLabel(venueCity.timeZone)})
        </b>
        .
      </p>
    )}
  </FormSection>
);

/** Числовое или текстовое поле в сетке раздела «Участие». */
const GridField: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({ id, label, children }) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    {children}
  </div>
);

export const ParticipationSection: React.FC<SectionProps> = ({ form, update }) => (
  <FormSection n={4} title="Участие" hint="Как люди попадают на мероприятие и сколько их может быть.">
    <div>
      <span className={labelClass}>Как записываются</span>
      <div className="grid sm:grid-cols-2 gap-3">
        {(['APPROVAL', 'OPEN'] as JoinMode[]).map((mode) => (
          <label key={mode} className={`relative cursor-pointer ${choiceClass(form.joinMode === mode)}`}>
            {/*
              position: relative на label обязателен: input ниже визуально скрыт через
              sr-only (position: absolute). Без своего positioned-родителя браузер при
              клике/фокусе вычисляет position:absolute относительно вьюпорта (а не этого
              label) и прокручивает им весь документ в произвольную точку — страница
              выглядит как «побелевшая»/пустая. relative здесь — предотвращает это.
            */}
            <input
              type="radio"
              name="joinMode"
              value={mode}
              className="sr-only"
              checked={form.joinMode === mode}
              onChange={() => update({ joinMode: mode })}
            />
            <div className="font-semibold text-slate-900">{mode === 'APPROVAL' ? 'С подтверждением организатора' : JOIN_MODE_LABELS.OPEN}</div>
            <p className="text-sm text-slate-500 mt-0.5">
              {mode === 'APPROVAL'
                ? 'Участник подаёт заявку, вы принимаете или отклоняете её.'
                : 'Запись подтверждается сразу, пока есть свободные места.'}
            </p>
          </label>
        ))}
      </div>
    </div>

    <div className="grid sm:grid-cols-3 gap-4">
      <GridField id="ev-cap" label="Количество мест">
        <input
          id="ev-cap"
          type="number"
          min={1}
          max={1000}
          required
          value={form.capacity}
          onChange={(e) => update({ capacity: Number(e.target.value) })}
          className={inputClass}
        />
      </GridField>
      <GridField id="ev-skill" label="Уровень подготовки">
        <select
          id="ev-skill"
          value={form.skillLevel}
          onChange={(e) => update({ skillLevel: e.target.value as SkillLevel })}
          className={inputClass}
        >
          {(['ANY', 'NOVICE', 'AMATEUR', 'PRO'] as SkillLevel[]).map((s) => (
            <option key={s} value={s}>
              {SKILL_LABELS[s]}
            </option>
          ))}
        </select>
      </GridField>
      <GridField id="ev-price" label="Стоимость, ₽">
        <input
          id="ev-price"
          type="number"
          min={0}
          max={1000000}
          placeholder="Бесплатно"
          value={form.price}
          onChange={(e) => update({ price: e.target.value })}
          className={inputClass}
        />
      </GridField>
      <GridField id="ev-min-age" label="Возраст от">
        <input
          id="ev-min-age"
          type="number"
          min={0}
          max={120}
          value={form.minAge}
          onChange={(e) => update({ minAge: e.target.value })}
          className={inputClass}
        />
      </GridField>
      <GridField id="ev-max-age" label="Возраст до">
        <input
          id="ev-max-age"
          type="number"
          min={0}
          max={120}
          value={form.maxAge}
          onChange={(e) => update({ maxAge: e.target.value })}
          className={inputClass}
        />
      </GridField>
      <GridField id="ev-deadline" label="Приём заявок до">
        <input
          id="ev-deadline"
          type="datetime-local"
          max={form.start}
          value={form.deadline}
          onChange={(e) => update({ deadline: e.target.value })}
          className={inputClass}
        />
      </GridField>
    </div>

    <GridField id="ev-equipment" label="Что взять с собой">
      <input
        id="ev-equipment"
        type="text"
        maxLength={500}
        placeholder="Кроссовки, своя ракетка, вода"
        value={form.equipment}
        onChange={(e) => update({ equipment: e.target.value })}
        className={inputClass}
      />
    </GridField>
  </FormSection>
);
