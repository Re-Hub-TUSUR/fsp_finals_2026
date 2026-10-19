import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { catalogApi, citiesApi, preferencesApi } from '../api';
import { errorMessage } from '../api/client';
import type { City, Preferences, PreferredTime, SkillLevel, Sport, UpdatePreferencesPayload } from '../types';
import { PREFERRED_TIME_LABELS, SKILL_LABELS } from '../utils/format';
import { inputClass, labelClass } from './FieldInput';

interface PreferencesFormProps {
  /** Текущие значения (если уже сохранены). */
  initial?: Preferences | null;
  /** Текст кнопки: «Сохранить» в профиле, «Продолжить» в регистрации. */
  submitLabel?: string;
  onSaved: (saved: Preferences) => void;
  onCancel?: () => void;
}

const TIMES: PreferredTime[] = ['MORNING', 'DAY', 'EVENING', 'WEEKEND'];
const SKILLS: SkillLevel[] = ['NOVICE', 'AMATEUR', 'PRO'];

const chip = (active: boolean) =>
  `px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
    active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
  }`;

/**
 * Форма интересов и предпочтений. Самодостаточна: сама загружает справочники и сохраняет через
 * PUT /api/v1/me/preferences — её можно встроить шагом в форму регистрации.
 */
export const PreferencesForm: React.FC<PreferencesFormProps> = ({ initial, submitLabel = 'Сохранить', onSaved, onCancel }) => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [sportIds, setSportIds] = useState<number[]>(initial?.sports.map((s) => s.id) ?? []);
  const [cityId, setCityId] = useState<number | ''>(initial?.homeCity?.id ?? '');
  const [skill, setSkill] = useState<SkillLevel | ''>(initial?.skillLevel ?? '');
  const [distance, setDistance] = useState(initial?.maxDistanceKm ?? 25);
  const [times, setTimes] = useState<PreferredTime[]>(initial?.preferredTimes ?? []);
  const [maxPrice, setMaxPrice] = useState(initial?.maxPrice != null ? String(initial.maxPrice) : '');
  const [birthYear, setBirthYear] = useState(initial?.birthYear != null ? String(initial.birthYear) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([catalogApi.sports(), citiesApi.list()])
      .then(([s, c]) => {
        setSports(s);
        setCities(c);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (sportIds.length === 0) return setError('Выберите хотя бы один вид спорта');
    if (cityId === '') return setError('Выберите город — рекомендации подбираются рядом с вами');
    const payload: UpdatePreferencesPayload = {
      sportIds,
      homeCityId: Number(cityId),
      // Точку дома сохраняем, только если город не меняли (её задаёт геолокация, а не эта форма)
      homeLat: initial?.homeCity?.id === Number(cityId) ? initial?.homeLat : undefined,
      homeLng: initial?.homeCity?.id === Number(cityId) ? initial?.homeLng : undefined,
      skillLevel: skill || undefined,
      maxDistanceKm: distance,
      preferredTimes: times,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
    };
    setSaving(true);
    try {
      onSaved(await preferencesApi.update(payload));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <span className={labelClass}>
          Что вам интересно <span className="text-red-500">*</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {sports.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={sportIds.includes(s.id)}
              onClick={() => setSportIds((ids) => toggle(ids, s.id))}
              className={chip(sportIds.includes(s.id))}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pref-city" className={labelClass}>
            Город <span className="text-red-500">*</span>
          </label>
          <select id="pref-city" value={cityId} onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : '')} className={inputClass}>
            <option value="">— выберите —</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.region && c.region !== c.name ? `, ${c.region}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pref-distance" className={labelClass}>
            Искать в радиусе: {distance} км
          </label>
          <input
            id="pref-distance"
            type="range"
            min={1}
            max={100}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="w-full accent-emerald-600 mt-3"
          />
        </div>
      </div>

      <div>
        <span className={labelClass}>Уровень подготовки</span>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <button type="button" key={s} aria-pressed={skill === s} onClick={() => setSkill(skill === s ? '' : s)} className={chip(skill === s)}>
              {SKILL_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className={labelClass}>Когда удобно</span>
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => (
            <button type="button" key={t} aria-pressed={times.includes(t)} onClick={() => setTimes((v) => toggle(v, t))} className={chip(times.includes(t))}>
              {PREFERRED_TIME_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">По местному времени места проведения.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pref-price" className={labelClass}>
            Бюджет на участие, ₽
          </label>
          <input
            id="pref-price"
            type="number"
            min={0}
            placeholder="Не важно"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pref-year" className={labelClass}>
            Год рождения
          </label>
          <input
            id="pref-year"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            placeholder="Для возрастных ограничений"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-5 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Отмена
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
