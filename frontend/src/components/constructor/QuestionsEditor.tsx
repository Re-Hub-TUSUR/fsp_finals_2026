import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FieldDef, FieldType } from '../../types';
import { inputClass } from '../FieldInput';

interface QuestionsEditorProps {
  questions: FieldDef[];
  onChange: (questions: FieldDef[]) => void;
  max?: number;
}

const TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'TEXT', label: 'Короткий ответ' },
  { value: 'TEXTAREA', label: 'Длинный ответ' },
  { value: 'NUMBER', label: 'Число' },
  { value: 'SELECT', label: 'Выбор одного' },
  { value: 'MULTISELECT', label: 'Выбор нескольких' },
  { value: 'BOOLEAN', label: 'Да / нет' },
];

const isChoice = (t: FieldType) => t === 'SELECT' || t === 'MULTISELECT';

/** Конструктор анкеты: какие вопросы организатор задаёт тем, кто подаёт заявку. */
export const QuestionsEditor: React.FC<QuestionsEditorProps> = ({ questions, onChange, max = 8 }) => {
  const update = (index: number, patch: Partial<FieldDef>) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const add = () =>
    onChange([
      ...questions,
      { key: `q${Date.now().toString(36)}${questions.length}`, label: '', type: 'TEXT', required: false },
    ]);

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-sm text-slate-500">Вопросов нет — участники подают заявку без анкеты.</p>
      )}
      {questions.map((q, i) => (
        <div key={q.key} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/60">
          <div className="flex gap-2">
            <input
              type="text"
              value={q.label}
              maxLength={100}
              placeholder="Текст вопроса"
              aria-label={`Вопрос ${i + 1}`}
              onChange={(e) => update(i, { label: e.target.value })}
              className={inputClass}
            />
            <button
              type="button"
              aria-label="Удалить вопрос"
              onClick={() => onChange(questions.filter((_, idx) => idx !== i))}
              className="shrink-0 px-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={q.type}
              aria-label="Тип ответа"
              onChange={(e) => {
                const type = e.target.value as FieldType;
                update(i, {
                  type,
                  options: isChoice(type) ? (q.options ?? []) : undefined,
                  ...(type === 'NUMBER' ? { min: q.min ?? 0 } : { min: undefined, max: undefined, integer: undefined }),
                });
              }}
              className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => update(i, { required: e.target.checked })}
                className="w-4 h-4 accent-brand"
              />
              Обязательный
            </label>
          </div>
          {q.type === 'NUMBER' && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <label className="flex items-center gap-1.5">
                От
                <input
                  type="number"
                  min={0}
                  aria-label="Минимальное значение"
                  value={q.min ?? 0}
                  onChange={(e) => update(i, { min: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </label>
              <label className="flex items-center gap-1.5">
                до
                <input
                  type="number"
                  min={q.min ?? 0}
                  aria-label="Максимальное значение"
                  value={q.max ?? ''}
                  placeholder="∞"
                  onChange={(e) => update(i, { max: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={q.integer === true}
                  onChange={(e) => update(i, { integer: e.target.checked || undefined })}
                  className="w-4 h-4 accent-brand"
                />
                Только целые
              </label>
            </div>
          )}
          {isChoice(q.type) && (
            <input
              type="text"
              value={(q.options ?? []).join(', ')}
              placeholder="Варианты через запятую: S, M, L"
              aria-label="Варианты ответа"
              onChange={(e) =>
                update(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })
              }
              className={inputClass}
            />
          )}
        </div>
      ))}
      {questions.length < max && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:text-brand-ink"
        >
          <Plus className="w-4 h-4" />
          Добавить вопрос
        </button>
      )}
    </div>
  );
};
