import React from 'react';
import type { FieldDef, FieldValue } from '../types';

interface FieldInputProps {
  field: FieldDef;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  disabled?: boolean;
}

export const inputClass =
  'w-full px-3.5 py-2.5 text-base border border-slate-300 rounded-xl outline-none bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100 disabled:text-slate-400';

export const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

/** Рисует поле формы по его описанию — основа конструктора: форма создаётся данными, а не кодом. */
export const FieldInput: React.FC<FieldInputProps> = ({ field, value, onChange, disabled }) => {
  const id = `field-${field.key}`;

  let control: React.ReactNode;
  switch (field.type) {
    case 'TEXTAREA':
      control = (
        <textarea
          id={id}
          rows={3}
          disabled={disabled}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );
      break;
    case 'NUMBER':
      control = (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step="any"
            disabled={disabled}
            placeholder={field.placeholder}
            value={(value as number | string | undefined) ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            className={inputClass}
          />
          {field.unit && <span className="text-sm text-slate-500 shrink-0">{field.unit}</span>}
        </div>
      );
      break;
    case 'SELECT':
      control = (
        <select
          id={id}
          disabled={disabled}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={inputClass}
        >
          <option value="">— выберите —</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;
    case 'MULTISELECT': {
      const chosen = (value as string[] | undefined) ?? [];
      control = (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const active = chosen.includes(o);
            return (
              <button
                type="button"
                key={o}
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onChange(active ? chosen.filter((c) => c !== o) : [...chosen, o])}
                className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
                  active
                    ? 'bg-brand border-brand text-on-brand'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case 'BOOLEAN':
      return (
        <div>
          <label className="flex items-center gap-3 text-base text-slate-800 cursor-pointer">
            <input
              id={id}
              type="checkbox"
              disabled={disabled}
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              className="w-5 h-5 accent-brand"
            />
            <span>
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </span>
          </label>
          {field.help && <p className="text-xs text-slate-500 mt-1 ml-8">{field.help}</p>}
        </div>
      );
    default:
      control = (
        <input
          id={id}
          type="text"
          disabled={disabled}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      {control}
      {field.help && <p className="text-xs text-slate-500 mt-1">{field.help}</p>}
    </div>
  );
};

/** Оставляет только заполненные значения (пустые строки/массивы не отправляем). */
export function pruneValues(values: Record<string, FieldValue>): Record<string, FieldValue> {
  const result: Record<string, FieldValue> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    result[key] = value;
  }
  return result;
}

/** Текст для показа значения поля в карточке. */
export function displayValue(field: FieldDef, value: FieldValue): string | null {
  if (value === undefined || value === '') return null;
  if (field.type === 'BOOLEAN') return value ? 'Да' : 'Нет';
  if (Array.isArray(value)) return value.join(', ');
  return field.unit ? `${value} ${field.unit}` : String(value);
}
