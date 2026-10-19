import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { OrgDetails, ProgramItem } from '../../types';
import { inputClass, labelClass } from '../FieldInput';
import { TagInput } from './TagInput';

interface OrgDetailsFormProps {
  value: OrgDetails;
  onChange: (value: OrgDetails) => void;
}

const DOC_SUGGESTIONS = ['Паспорт', 'Медицинская справка', 'Полис страхования', 'Согласие родителей (для несовершеннолетних)'];
const FACILITY_SUGGESTIONS = ['Раздевалки', 'Душ', 'Парковка', 'Питьевая вода', 'Медпункт', 'Буфет', 'Wi-Fi'];

/** Дополнительные сведения, обязательные для мероприятий от имени организации. */
export const OrgDetailsForm: React.FC<OrgDetailsFormProps> = ({ value, onChange }) => {
  const set = (patch: Partial<OrgDetails>) => onChange({ ...value, ...patch });
  const program = value.program ?? [];
  const setProgram = (items: ProgramItem[]) => set({ program: items });

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="org-contact-name" className={labelClass}>
            Контактное лицо <span className="text-red-500">*</span>
          </label>
          <input
            id="org-contact-name"
            type="text"
            maxLength={100}
            value={value.contactName ?? ''}
            onChange={(e) => set({ contactName: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="org-contact-phone" className={labelClass}>
            Телефон <span className="text-red-500">*</span>
          </label>
          <input
            id="org-contact-phone"
            type="tel"
            maxLength={40}
            placeholder="+7 391 000-00-00"
            value={value.contactPhone ?? ''}
            onChange={(e) => set({ contactPhone: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="org-contact-email" className={labelClass}>
            E-mail
          </label>
          <input
            id="org-contact-email"
            type="email"
            maxLength={120}
            value={value.contactEmail ?? ''}
            onChange={(e) => set({ contactEmail: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="org-website" className={labelClass}>
            Сайт или регламент
          </label>
          <input
            id="org-website"
            type="url"
            maxLength={300}
            placeholder="https://"
            value={value.website ?? ''}
            onChange={(e) => set({ website: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 -mt-3">Нужен телефон или e-mail — участники должны уметь с вами связаться.</p>

      <div>
        <label htmlFor="org-venue" className={labelClass}>
          Площадка
        </label>
        <input
          id="org-venue"
          type="text"
          maxLength={200}
          placeholder="Название спорткомплекса, стадиона, зала"
          value={value.venueName ?? ''}
          onChange={(e) => set({ venueName: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <span className={labelClass}>Требования к участникам</span>
        <div className="space-y-2 mb-3">
          <label className="flex items-center gap-3 text-base text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={value.medicalCertificateRequired === true}
              onChange={(e) => set({ medicalCertificateRequired: e.target.checked })}
              className="w-5 h-5 accent-brand"
            />
            Нужна медицинская справка
          </label>
          <label className="flex items-center gap-3 text-base text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={value.insuranceRequired === true}
              onChange={(e) => set({ insuranceRequired: e.target.checked })}
              className="w-5 h-5 accent-brand"
            />
            Нужна страховка
          </label>
        </div>
        <TagInput
          values={value.requiredDocuments ?? []}
          onChange={(requiredDocuments) => set({ requiredDocuments })}
          placeholder="Документы, которые взять с собой"
          suggestions={DOC_SUGGESTIONS}
          max={10}
        />
        <p className="text-xs text-slate-500 mt-1">
          Если указаны требования, участник подтвердит ознакомление при подаче заявки.
        </p>
      </div>

      <div>
        <label htmlFor="org-prizes" className={labelClass}>
          Призы и награждение
        </label>
        <input
          id="org-prizes"
          type="text"
          maxLength={500}
          value={value.prizes ?? ''}
          onChange={(e) => set({ prizes: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <span className={labelClass}>Программа мероприятия</span>
        <div className="space-y-2">
          {program.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                maxLength={40}
                placeholder="10:00"
                aria-label={`Время пункта ${i + 1}`}
                value={item.time ?? ''}
                onChange={(e) => setProgram(program.map((p, idx) => (idx === i ? { ...p, time: e.target.value } : p)))}
                className={`${inputClass} w-28 sm:w-36 shrink-0`}
              />
              <input
                type="text"
                maxLength={200}
                placeholder="Что происходит"
                aria-label={`Название пункта ${i + 1}`}
                value={item.title}
                onChange={(e) => setProgram(program.map((p, idx) => (idx === i ? { ...p, title: e.target.value } : p)))}
                className={inputClass}
              />
              <button
                type="button"
                aria-label="Удалить пункт программы"
                onClick={() => setProgram(program.filter((_, idx) => idx !== i))}
                className="shrink-0 px-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {program.length < 20 && (
            <button
              type="button"
              onClick={() => setProgram([...program, { time: '', title: '' }])}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:text-brand-ink"
            >
              <Plus className="w-4 h-4" />
              Добавить пункт
            </button>
          )}
        </div>
      </div>

      <div>
        <span className={labelClass}>Инфраструктура на площадке</span>
        <TagInput
          values={value.facilities ?? []}
          onChange={(facilities) => set({ facilities })}
          placeholder="Что есть на площадке"
          suggestions={FACILITY_SUGGESTIONS}
        />
      </div>

      <div>
        <label htmlFor="org-cancel" className={labelClass}>
          Условия отмены и возврата взноса
        </label>
        <textarea
          id="org-cancel"
          rows={2}
          maxLength={1000}
          value={value.cancellationPolicy ?? ''}
          onChange={(e) => set({ cancellationPolicy: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="org-sponsors" className={labelClass}>
          Партнёры и спонсоры
        </label>
        <input
          id="org-sponsors"
          type="text"
          maxLength={300}
          value={value.sponsors ?? ''}
          onChange={(e) => set({ sponsors: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  );
};
