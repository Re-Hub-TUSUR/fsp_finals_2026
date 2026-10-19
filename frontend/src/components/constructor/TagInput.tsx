import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { inputClass } from '../FieldInput';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  suggestions?: string[];
  max?: number;
}

/** Список коротких пунктов: вводим текст + Enter либо выбираем из подсказок. */
export const TagInput: React.FC<TagInputProps> = ({ values, onChange, placeholder, suggestions = [], max = 15 }) => {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value || values.includes(value) || values.length >= max) return;
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 bg-brand-tint text-brand-ink border border-brand-line rounded-full pl-3 pr-1.5 py-1 text-sm"
            >
              {v}
              <button
                type="button"
                aria-label={`Убрать «${v}»`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="p-0.5 rounded-full hover:bg-brand-tint-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          aria-label="Добавить"
          className="shrink-0 px-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {suggestions.filter((s) => !values.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => add(s)}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-600 hover:border-brand-line hover:text-brand-ink"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
