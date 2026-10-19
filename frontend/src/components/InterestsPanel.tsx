import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Settings2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PreferencesForm } from './PreferencesForm';
import { PREFERRED_TIME_LABELS, SKILL_LABELS } from '../utils/format';

/**
 * Интересы и предпочтения в профиле: на их основе строится страница «Для вас».
 * Сводка + форма редактирования; сохраняет через PUT /api/v1/me/preferences.
 */
export const InterestsPanel: React.FC = () => {
  const { preferences, refreshPreferences } = useAuth();
  const [editing, setEditing] = useState(false);

  const configured = !!preferences?.configured;
  const details: string[] = [];
  if (preferences?.homeCity) details.push(`Город: ${preferences.homeCity.name}`);
  if (preferences) details.push(`Радиус: ${preferences.maxDistanceKm} км`);
  if (preferences?.skillLevel) details.push(`Уровень: ${SKILL_LABELS[preferences.skillLevel]}`);
  if (preferences && preferences.preferredTimes.length > 0) {
    details.push(`Удобно: ${preferences.preferredTimes.map((t) => PREFERRED_TIME_LABELS[t].toLowerCase()).join(', ')}`);
  }
  if (preferences?.maxPrice != null) details.push(`Бюджет: до ${preferences.maxPrice.toLocaleString('ru-RU')} ₽`);

  return (
    <section aria-labelledby="interests-title" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="interests-title" className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Heart className="h-6 w-6 text-brand-ink" /> Мои интересы
          </h2>
          <p className="mt-1 text-sm text-muted">
            По ним мы подбираем мероприятия на странице «Для вас». Можно изменить в любой момент.
          </p>
        </div>
        {!editing && (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/recommended"
              className="flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-surface"
            >
              <Sparkles className="h-4 w-4" /> Рекомендации
            </Link>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover"
            >
              <Settings2 className="h-4 w-4" /> {configured ? 'Изменить' : 'Указать интересы'}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-5">
          <PreferencesForm
            initial={preferences}
            submitLabel="Сохранить интересы"
            onCancel={() => setEditing(false)}
            onSaved={async () => {
              await refreshPreferences();
              setEditing(false);
            }}
          />
        </div>
      ) : configured && preferences ? (
        <div className="mt-4 space-y-3">
          <ul className="flex flex-wrap gap-2" aria-label="Выбранные виды спорта">
            {preferences.sports.length > 0 ? (
              preferences.sports.map((s) => (
                <li key={s.id} className="rounded-full border border-brand-line bg-brand-tint px-3 py-1 text-sm font-medium text-brand-ink">
                  {s.name}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted">Виды спорта не выбраны</li>
            )}
          </ul>
          {details.length > 0 && <p className="text-sm text-muted">{details.join(' · ')}</p>}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-surface p-4 text-sm text-ink">
          Вы ещё не указали интересы — пока мы показываем популярное рядом. Выберите виды спорта и город, и подборка станет точнее.
        </p>
      )}
    </section>
  );
};
