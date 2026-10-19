import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CustomField } from '../../types';
import { inputClass } from '../FieldInput';

interface CustomFieldsEditorProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  max?: number;
}

/** Свои параметры «название — значение», которых нет в шаблоне: гибкость под любое мероприятие. */
export const CustomFieldsEditor: React.FC<CustomFieldsEditorProps> = ({ fields, onChange, max = 10 }) => (
  <div className="space-y-2">
    {fields.map((f, i) => (
      <div key={i} className="flex gap-2">
        <input
          type="text"
          value={f.label}
          maxLength={80}
          placeholder="Название (например, Взнос)"
          aria-label={`Название параметра ${i + 1}`}
          onChange={(e) => onChange(fields.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))}
          className={`${inputClass} sm:w-2/5`}
        />
        <input
          type="text"
          value={f.value}
          maxLength={500}
          placeholder="Значение"
          aria-label={`Значение параметра ${i + 1}`}
          onChange={(e) => onChange(fields.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
          className={inputClass}
        />
        <button
          type="button"
          aria-label="Удалить параметр"
          onClick={() => onChange(fields.filter((_, idx) => idx !== i))}
          className="shrink-0 px-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    ))}
    {fields.length < max && (
      <button
        type="button"
        onClick={() => onChange([...fields, { label: '', value: '' }])}
        className="flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:text-brand-ink"
      >
        <Plus className="w-4 h-4" />
        Добавить параметр
      </button>
    )}
  </div>
);
