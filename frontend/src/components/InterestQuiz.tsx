import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, X } from 'lucide-react';
import { catalogApi, citiesApi, preferencesApi } from '../api';
import { errorMessage } from '../api/client';
import type { City, Preferences, PreferredTime, SkillLevel, Sport } from '../types';
import { sportIconPath } from '../utils/sportIcons';

interface Props {
  initial?: Preferences | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

type Mood = 'ENERGY' | 'BALANCE' | 'TEAM' | 'DISCOVERY';

const moods: Array<{ id: Mood; emoji: string; title: string; text: string; match: RegExp }> = [
  { id: 'ENERGY', emoji: '⚡', title: 'Больше энергии', text: 'Движение, скорость и вызов себе', match: /бег|вело|лыж|плав|воркаут/iu },
  { id: 'BALANCE', emoji: '🌿', title: 'Поймать баланс', text: 'Спокойный ритм и забота о себе', match: /йога|туризм|ходьб|плав/iu },
  { id: 'TEAM', emoji: '🙌', title: 'Быть в команде', text: 'Новые знакомства и общий азарт', match: /футбол|баскет|волейбол|игры|танц/iu },
  { id: 'DISCOVERY', emoji: '🧭', title: 'Пробовать новое', text: 'Необычные форматы и впечатления', match: /туризм|теннис|шахмат|танц|другое/iu },
];

const times: Array<{ id: PreferredTime; emoji: string; title: string; text: string }> = [
  { id: 'MORNING', emoji: '🌅', title: 'Утром', text: 'Начать день активно' },
  { id: 'DAY', emoji: '☀️', title: 'Днём', text: 'Поймать свободное окно' },
  { id: 'EVENING', emoji: '🌙', title: 'Вечером', text: 'Переключиться после дел' },
  { id: 'WEEKEND', emoji: '🎒', title: 'В выходные', text: 'Никуда не спешить' },
];

const levels: Array<{ id: SkillLevel; emoji: string; title: string; text: string }> = [
  { id: 'NOVICE', emoji: '🌱', title: 'Начинаю', text: 'Хочу комфортный первый шаг' },
  { id: 'AMATEUR', emoji: '🔥', title: 'Уже в теме', text: 'Занимаюсь для себя' },
  { id: 'PRO', emoji: '🏆', title: 'Люблю вызов', text: 'Готов к интенсивному темпу' },
];

const toggle = <T,>(items: T[], item: T) => items.includes(item) ? items.filter((x) => x !== item) : [...items, item];

const SportGlyph = ({ name }: { name: string }) => <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={sportIconPath(name)} /></svg>;

export const InterestQuiz: React.FC<Props> = ({ initial, onClose, onSaved }) => {
  const [step, setStep] = useState(0);
  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [mood, setMood] = useState<Mood>();
  const [sportIds, setSportIds] = useState<number[]>(initial?.sports.map((s) => s.id) ?? []);
  const [preferredTimes, setPreferredTimes] = useState<PreferredTime[]>(initial?.preferredTimes ?? []);
  const [skill, setSkill] = useState<SkillLevel>(initial?.skillLevel ?? 'NOVICE');
  const [cityId, setCityId] = useState<number | ''>(initial?.homeCity?.id ?? '');
  const [distance, setDistance] = useState(initial?.maxDistanceKm ?? 20);
  const [freeOnly, setFreeOnly] = useState(initial?.maxPrice === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([catalogApi.sports(), citiesApi.list()]).then(([allSports, allCities]) => {
      setSports(allSports.filter((sport) => !sport.custom)); setCities(allCities);
    }).catch((err) => setError(errorMessage(err)));
  }, []);

  const suggested = useMemo(() => moods.find((item) => item.id === mood), [mood]);
  const selectMood = (id: Mood) => {
    setMood(id);
  };

  const canNext = step === 0 ? !!mood : step === 1 ? sportIds.length > 0 : step === 2 ? preferredTimes.length > 0 : step === 4 ? cityId !== '' : true;

  const finish = async () => {
    setSaving(true); setError('');
    try {
      await preferencesApi.update({
        sportIds, skillLevel: skill, homeCityId: Number(cityId), maxDistanceKm: distance,
        preferredTimes, maxPrice: freeOnly ? 0 : undefined, birthYear: initial?.birthYear,
      });
      await onSaved(); setStep(5);
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-page/95 backdrop-blur-xl">
    <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-5 sm:px-8 sm:py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-extrabold text-ink"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-brand"><Sparkles className="h-5 w-5" /></span>Компас интересов</div>
        <button onClick={onClose} aria-label="Закрыть" className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink hover:bg-surface"><X className="h-5 w-5" /></button>
      </div>

      {step < 5 && <div className="mt-6 flex gap-2">{[0,1,2,3,4].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? 'bg-brand' : 'bg-surface-2'}`} />)}</div>}

      <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
        {step === 0 && <QuizStep eyebrow="Начнём с ощущения" title="Чего вам сейчас хочется?" subtitle="Не думайте о конкретном спорте — выберите настроение.">
          <div className="grid gap-3 sm:grid-cols-2">{moods.map((item) => <Choice key={item.id} active={mood === item.id} onClick={() => selectMood(item.id)} emoji={item.emoji} title={item.title} text={item.text} />)}</div>
        </QuizStep>}

        {step === 1 && <QuizStep eyebrow={suggested ? `Для настроения «${suggested.title.toLowerCase()}»` : 'Ваши активности'} title="Что хочется попробовать?" subtitle="Мы уже отметили несколько вариантов. Оставьте любимые — можно выбрать сколько угодно.">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sports.map((sport) => { const active = sportIds.includes(sport.id); return <button key={sport.id} onClick={() => setSportIds((ids) => toggle(ids, sport.id))} className={`relative flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center font-extrabold transition-all ${active ? 'animate-[interest-card-wiggle_.38s_ease-in-out] border-brand bg-brand text-on-brand shadow-card' : 'border-line bg-white text-ink hover:-translate-y-0.5 hover:border-brand-line'}`}><SportGlyph name={sport.name} /><span className="leading-tight">{sport.name}</span>{active && <Check className="absolute right-3 top-3 h-4 w-4" />}</button>; })}
          </div>
        </QuizStep>}

        {step === 2 && <QuizStep eyebrow="Ваш ритм" title="Когда вы готовы сорваться на событие?" subtitle="Можно выбрать несколько вариантов — рекомендации подстроятся под расписание.">
          <div className="grid gap-3 sm:grid-cols-2">{times.map((item) => <Choice key={item.id} active={preferredTimes.includes(item.id)} onClick={() => setPreferredTimes((value) => toggle(value, item.id))} emoji={item.emoji} title={item.title} text={item.text} />)}</div>
        </QuizStep>}

        {step === 3 && <QuizStep eyebrow="Комфортный темп" title="Какой уровень ощущается своим?" subtitle="Это не экзамен — нужен только подходящий старт.">
          <div className="grid gap-3 sm:grid-cols-3">{levels.map((item) => <Choice key={item.id} active={skill === item.id} onClick={() => setSkill(item.id)} emoji={item.emoji} title={item.title} text={item.text} />)}</div>
        </QuizStep>}

        {step === 4 && <QuizStep eyebrow="Почти готово" title="Где искать ваши события?" subtitle="Последний штрих — город и комфортное расстояние.">
          <div className="mx-auto w-full max-w-xl space-y-6 rounded-3xl border border-line bg-white p-5 sm:p-8">
            <label className="block"><span className="mb-2 block text-sm font-bold text-ink">Город</span><select value={cityId} onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-xl border border-line-2 bg-white px-4 py-3 text-ink outline-none focus:border-brand"><option value="">Выберите город</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}{city.region && city.region !== city.name ? `, ${city.region}` : ''}</option>)}</select></label>
            <label className="block"><span className="flex justify-between text-sm font-bold text-ink"><span>Как далеко готовы ехать?</span><span className="text-brand-ink">{distance} км</span></span><input type="range" min="3" max="100" step="1" value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="mt-4 w-full accent-[var(--color-brand)]" /></label>
            <button onClick={() => setFreeOnly((value) => !value)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${freeOnly ? 'border-brand bg-brand-tint' : 'border-line bg-surface'}`}><span><b className="block text-ink">Только бесплатные события</b><span className="text-sm text-muted">Можно изменить позже</span></span><span className={`flex h-6 w-6 items-center justify-center rounded-full ${freeOnly ? 'bg-brand text-on-brand' : 'border border-line-2'}`}>{freeOnly && <Check className="h-4 w-4" />}</span></button>
          </div>
        </QuizStep>}

        {step === 5 && <div className="mx-auto max-w-xl text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand text-on-brand shadow-card"><Sparkles className="h-11 w-11" /></div><p className="mt-8 text-sm font-extrabold uppercase tracking-[.2em] text-brand-ink">Ваш профиль готов</p><h2 className="mt-3 text-4xl font-black text-ink sm:text-5xl">Мы поймали ваш ритм</h2><p className="mt-4 text-lg text-muted">Теперь лента «Для вас» будет учитывать ваши активности, уровень, расписание и расстояние.</p><button onClick={onClose} className="mt-8 rounded-2xl bg-brand px-7 py-3.5 font-bold text-on-brand hover:bg-brand-hover">Смотреть рекомендации</button></div>}
      </div>

      {step < 5 && <div className="flex items-center justify-between border-t border-line pt-5"><button disabled={step === 0 || saving} onClick={() => setStep((value) => value - 1)} className="flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-muted disabled:invisible"><ArrowLeft className="h-4 w-4" />Назад</button><div className="text-sm font-semibold text-muted">{step + 1} / 5</div><button disabled={!canNext || saving} onClick={() => step === 4 ? void finish() : setStep((value) => value + 1)} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-on-brand disabled:opacity-40">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : step === 4 ? 'Собрать профиль' : <>Дальше<ArrowRight className="h-4 w-4" /></>}</button></div>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{error}</p>}
    </div>
  </div>;
};

const QuizStep: React.FC<{ eyebrow: string; title: string; subtitle: string; children: React.ReactNode }> = ({ eyebrow, title, subtitle, children }) => <div><div className="mx-auto mb-8 max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-brand-ink">{eyebrow}</p><h2 className="mt-3 text-3xl font-black text-ink sm:text-5xl">{title}</h2><p className="mt-3 text-base text-muted sm:text-lg">{subtitle}</p></div>{children}</div>;

const Choice: React.FC<{ active: boolean; onClick: () => void; emoji: string; title: string; text: string }> = ({ active, onClick, emoji, title, text }) => <button onClick={onClick} className={`flex min-h-28 items-center gap-4 rounded-2xl border p-5 text-left transition-all ${active ? 'scale-[1.01] border-brand bg-brand-tint shadow-card' : 'border-line bg-white hover:-translate-y-0.5 hover:border-brand-line'}`}><span className="text-4xl">{emoji}</span><span className="flex-1"><b className="block text-lg text-ink">{title}</b><span className="mt-1 block text-sm text-muted">{text}</span></span><span className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? 'bg-brand text-on-brand' : 'border border-line-2'}`}>{active && <Check className="h-4 w-4" />}</span></button>;
