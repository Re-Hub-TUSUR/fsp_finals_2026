import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, X } from 'lucide-react';
import { catalogApi, citiesApi, preferencesApi } from '../api';
import { errorMessage } from '../api/client';
import type { City, Preferences, PreferredTime, Sport } from '../types';
import { sportIconPath } from '../utils/sportIcons';

interface Props {
  initial?: Preferences | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onFinish?: () => void;
}

type LeisureType = 'ACTIVE' | 'CALM' | 'TEAM' | 'DISCOVERY';

const leisureTypes: Array<{ id: LeisureType; emoji: string; title: string; text: string; match: RegExp }> = [
  { id: 'ACTIVE', emoji: '⚡', title: 'Активный', text: 'Движение, скорость и физическая нагрузка', match: /бег|вело|футбол|баскет|волейбол|лыж|плав|воркаут|теннис|танц/iu },
  { id: 'CALM', emoji: '🌿', title: 'Спокойный', text: 'Размеренный темп и возможность переключиться', match: /йога|ходьб|шахмат|настольн|плав|туризм/iu },
  { id: 'TEAM', emoji: '🙌', title: 'В компании', text: 'Общение, команда и общий азарт', match: /футбол|баскет|волейбол|настольн|танц|теннис/iu },
  { id: 'DISCOVERY', emoji: '🧭', title: 'Новые впечатления', text: 'Пробовать необычное и менять привычный ритм', match: /туризм|лыж|танц|теннис|скандинав|другое/iu },
];

const times: Array<{ id: PreferredTime; emoji: string; title: string; text: string }> = [
  { id: 'MORNING', emoji: '🌅', title: 'Утро', text: 'Начинать день с любимого занятия' },
  { id: 'DAY', emoji: '☀️', title: 'День', text: 'Заниматься в свободное дневное время' },
  { id: 'EVENING', emoji: '🌙', title: 'Вечер', text: 'Переключаться после работы или учёбы' },
  { id: 'WEEKEND', emoji: '🎒', title: 'Выходные', text: 'Планировать досуг без спешки' },
];

const ageMatch = (age: number): RegExp => {
  if (age < 18) return /футбол|баскет|волейбол|танц|плав|настольн|теннис|лыж/iu;
  if (age < 36) return /бег|вело|футбол|баскет|волейбол|воркаут|лыж|плав|теннис|туризм/iu;
  if (age < 55) return /плав|вело|йога|туризм|ходьб|лыж|теннис|настольн/iu;
  return /ходьб|йога|плав|шахмат|настольн|туризм|лыж/iu;
};

const toggle = <T,>(items: T[], item: T) => items.includes(item) ? items.filter((x) => x !== item) : [...items, item];
const SportGlyph = ({ name }: { name: string }) => <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={sportIconPath(name)} /></svg>;

export const InterestQuiz: React.FC<Props> = ({ initial, onClose, onSaved, onFinish }) => {
  const currentYear = new Date().getFullYear();
  const [step, setStep] = useState(0);
  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [birthYear, setBirthYear] = useState(initial?.birthYear ? String(initial.birthYear) : '');
  const [leisureType, setLeisureType] = useState<LeisureType>();
  const [preferredTimes, setPreferredTimes] = useState<PreferredTime[]>(initial?.preferredTimes ?? []);
  const [sportIds, setSportIds] = useState<number[]>(initial?.sports.map((sport) => sport.id) ?? []);
  const [cityId, setCityId] = useState<number | ''>(initial?.homeCity?.id ?? '');
  const [distance, setDistance] = useState(initial?.maxDistanceKm ?? 25);
  const [freeOnly, setFreeOnly] = useState(initial?.maxPrice === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([catalogApi.sports(), citiesApi.list()])
      .then(([items, availableCities]) => { setSports(items.filter((sport) => !sport.custom)); setCities(availableCities); })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const validBirthYear = /^\d{4}$/.test(birthYear) && Number(birthYear) >= 1900 && Number(birthYear) <= currentYear;
  const selectedLeisure = leisureTypes.find((item) => item.id === leisureType);
  const suggestedSports = useMemo(() => {
    if (!validBirthYear || !selectedLeisure) return [];
    const agePattern = ageMatch(currentYear - Number(birthYear));
    const ranked = sports
      .map((sport, index) => ({ sport, index, score: (selectedLeisure.match.test(sport.name) ? 2 : 0) + (agePattern.test(sport.name) ? 1 : 0) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
    const matchedByBoth = ranked.filter(({ score }) => score === 3);
    return (matchedByBoth.length > 0 ? matchedByBoth : ranked.filter(({ score }) => score === 2))
      .slice(0, 6)
      .map(({ sport }) => sport);
  }, [birthYear, currentYear, selectedLeisure, sports, validBirthYear]);
  const suggestedIds = new Set(suggestedSports.map((sport) => sport.id));
  const otherSports = sports.filter((sport) => !suggestedIds.has(sport.id));
  const canNext = step === 0 ? validBirthYear : step === 1 ? !!leisureType : step === 2 ? preferredTimes.length > 0 : step === 3 ? sportIds.length > 0 : cityId !== '';

  const finish = async () => {
    setSaving(true); setError('');
    try {
      const sameCity = initial?.homeCity?.id === Number(cityId);
      await preferencesApi.update({
        sportIds, birthYear: Number(birthYear), preferredTimes,
        skillLevel: initial?.skillLevel, homeCityId: Number(cityId),
        homeLat: sameCity ? initial?.homeLat : undefined, homeLng: sameCity ? initial?.homeLng : undefined,
        maxDistanceKm: distance, maxPrice: freeOnly ? 0 : initial?.maxPrice === 0 ? undefined : initial?.maxPrice,
      });
      await onSaved(); setStep(5);
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-page/95 backdrop-blur-xl">
    <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-5 sm:px-8 sm:py-8">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-extrabold text-ink"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-brand"><Sparkles className="h-5 w-5" /></span>Компас интересов</div><button onClick={onClose} aria-label="Закрыть" className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink hover:bg-surface"><X className="h-5 w-5" /></button></div>
      {step < 5 && <div className="mt-6 flex gap-2">{[0, 1, 2, 3, 4].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-brand' : 'bg-surface-2'}`} />)}</div>}

      <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
        {step === 0 && <QuizStep eyebrow="Знакомство" title="В каком году вы родились?" subtitle="Возраст поможет предложить подходящие и комфортные виды активности."><label className="mx-auto block max-w-sm"><span className="sr-only">Год рождения</span><input autoFocus aria-label="Год рождения" type="number" min="1900" max={currentYear} value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="Например, 1998" className="w-full rounded-2xl border border-line-2 bg-white px-5 py-4 text-center text-2xl font-bold text-ink outline-none focus:border-brand" />{birthYear && !validBirthYear && <span className="mt-2 block text-center text-sm text-red-600">Введите год от 1900 до {currentYear}</span>}</label></QuizStep>}

        {step === 1 && <QuizStep eyebrow="Ваш характер" title="Какой досуг вы предпочитаете?" subtitle="Выберите вариант, который лучше всего описывает ваш привычный отдых."><div className="grid gap-3 sm:grid-cols-2">{leisureTypes.map((item) => <Choice key={item.id} active={leisureType === item.id} onClick={() => setLeisureType(item.id)} emoji={item.emoji} title={item.title} text={item.text} />)}</div></QuizStep>}

        {step === 2 && <QuizStep eyebrow="Ваш ритм" title="Когда вы любите заниматься досугом?" subtitle="Можно выбрать несколько вариантов — рекомендации учтут ваше расписание."><div className="grid gap-3 sm:grid-cols-2">{times.map((item) => <Choice key={item.id} active={preferredTimes.includes(item.id)} onClick={() => setPreferredTimes((value) => toggle(value, item.id))} emoji={item.emoji} title={item.title} text={item.text} />)}</div></QuizStep>}

        {step === 3 && <QuizStep eyebrow="Ваши интересы" title="Какие виды спорта вам интересны?" subtitle="Мы подняли наверх варианты с учётом возраста и предпочитаемого досуга. Выберите один или несколько.">{suggestedSports.length > 0 && <SportGroup title="Возможно, вам понравится" sports={suggestedSports} selected={sportIds} onToggle={(id) => setSportIds((ids) => toggle(ids, id))} highlighted />}<SportGroup title={suggestedSports.length > 0 ? 'Остальные виды спорта' : 'Все виды спорта'} sports={otherSports} selected={sportIds} onToggle={(id) => setSportIds((ids) => toggle(ids, id))} /></QuizStep>}

        {step === 4 && <QuizStep eyebrow="Почти готово" title="Где искать ваши события?" subtitle="Последний штрих — город и комфортное расстояние."><div className="mx-auto w-full max-w-xl space-y-6 rounded-3xl border border-line bg-white p-5 sm:p-8"><label className="block"><span className="mb-2 block text-sm font-bold text-ink">Город</span><select aria-label="Город" value={cityId} onChange={(event) => setCityId(event.target.value ? Number(event.target.value) : '')} className="w-full rounded-xl border border-line-2 bg-white px-4 py-3 text-ink outline-none focus:border-brand"><option value="">Выберите город</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}{city.region && city.region !== city.name ? `, ${city.region}` : ''}</option>)}</select></label><label className="block"><span className="flex justify-between text-sm font-bold text-ink"><span>Как далеко готовы ехать?</span><span className="text-brand-ink">{distance} км</span></span><input aria-label="Радиус поиска" type="range" min="3" max="100" step="1" value={distance} onChange={(event) => setDistance(Number(event.target.value))} className="mt-4 w-full accent-[var(--color-brand)]" /></label><button onClick={() => setFreeOnly((value) => !value)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${freeOnly ? 'border-brand bg-brand-tint' : 'border-line bg-surface'}`}><span><b className="block text-ink">Только бесплатные события</b><span className="text-sm text-muted">Можно изменить позже</span></span><span className={`flex h-6 w-6 items-center justify-center rounded-full ${freeOnly ? 'bg-brand text-on-brand' : 'border border-line-2'}`}>{freeOnly && <Check className="h-4 w-4" />}</span></button></div></QuizStep>}

        {step === 5 && <div className="mx-auto max-w-xl text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand text-on-brand shadow-card"><Sparkles className="h-11 w-11" /></div><p className="mt-8 text-sm font-extrabold uppercase tracking-[.2em] text-brand-ink">Ваш профиль готов</p><h2 className="mt-3 text-4xl font-black text-ink sm:text-5xl">Мы поймали ваш ритм</h2><p className="mt-4 text-lg text-muted">Теперь лента «Для вас» учитывает ваш возраст, интересы, удобное время и расстояние.</p><button onClick={onFinish ?? onClose} className="mt-8 rounded-2xl bg-brand px-7 py-3.5 font-bold text-on-brand hover:bg-brand-hover">Смотреть рекомендации</button></div>}
      </div>

      {step < 5 && <div className="flex items-center justify-between border-t border-line pt-5"><button disabled={step === 0 || saving} onClick={() => setStep((value) => value - 1)} className="flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-muted disabled:invisible"><ArrowLeft className="h-4 w-4" />Назад</button><div className="text-sm font-semibold text-muted">{step + 1} / 5</div><button disabled={!canNext || saving} onClick={() => step === 4 ? void finish() : setStep((value) => value + 1)} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-on-brand disabled:opacity-40">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : step === 4 ? 'Собрать профиль' : <>Дальше<ArrowRight className="h-4 w-4" /></>}</button></div>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{error}</p>}
    </div>
  </div>;
};

const SportGroup: React.FC<{ title: string; sports: Sport[]; selected: number[]; onToggle: (id: number) => void; highlighted?: boolean }> = ({ title, sports, selected, onToggle, highlighted }) => sports.length > 0 && <section className={highlighted ? 'mb-8 rounded-2xl border border-brand-line bg-brand-tint/40 p-4 sm:p-5' : ''}><h3 className="mb-4 text-lg font-extrabold text-ink">{title}</h3><div className="flex flex-wrap gap-2.5">{sports.map((sport) => { const active = selected.includes(sport.id); return <button key={sport.id} onClick={() => onToggle(sport.id)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2.5 font-bold ${active ? 'border-brand bg-brand text-on-brand' : 'border-line bg-white text-ink hover:border-brand-line'}`}><SportGlyph name={sport.name} /><span>{sport.name}</span>{active && <Check className="h-4 w-4" />}</button>; })}</div></section>;
const QuizStep: React.FC<{ eyebrow: string; title: string; subtitle: string; children: React.ReactNode }> = ({ eyebrow, title, subtitle, children }) => <div><div className="mx-auto mb-8 max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-brand-ink">{eyebrow}</p><h2 className="mt-3 text-3xl font-black text-ink sm:text-5xl">{title}</h2><p className="mt-3 text-base text-muted sm:text-lg">{subtitle}</p></div>{children}</div>;
const Choice: React.FC<{ active: boolean; onClick: () => void; emoji: string; title: string; text: string }> = ({ active, onClick, emoji, title, text }) => <button onClick={onClick} className={`flex min-h-28 items-center gap-4 rounded-2xl border p-5 text-left ${active ? 'scale-[1.01] border-brand bg-brand-tint shadow-card' : 'border-line bg-white hover:-translate-y-0.5 hover:border-brand-line'}`}><span className="text-4xl">{emoji}</span><span className="flex-1"><b className="block text-lg text-ink">{title}</b><span className="mt-1 block text-sm text-muted">{text}</span></span><span className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? 'bg-brand text-on-brand' : 'border border-line-2'}`}>{active && <Check className="h-4 w-4" />}</span></button>;
