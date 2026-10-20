import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, LocateFixed } from 'lucide-react';
import type { JoinMode, SkillLevel, Sport } from '../types';
import { SKILL_LABELS } from '../utils/format';
import { dayKey, keyToDate, sameWhen, whenLabel, whenPresets, type When } from '../utils/eventView';
import { Modal } from './Modal';
import { SectionLabel, Toggle } from './ui';

export type Radius = '1' | '3' | '5' | '10' | 'all';

export const RADIUS_OPTIONS: { value: Radius; label: string }[] = [
  { value: '1', label: '1 км' },
  { value: '3', label: '3 км' },
  { value: '5', label: '5 км' },
  { value: '10', label: '10 км' },
  { value: 'all', label: 'Без ограничения' },
];

export const radiusValue = (r: Radius) => (r === 'all' ? 'Без ограничения' : `${r} км`);

export interface HomeFilterState {
  sports: string[];
  radius: Radius;
  when: When;
  skill: SkillLevel | '';
  joinMode: JoinMode | '';
  freeOnly: boolean;
  freeCost: boolean;
}

export const DEFAULT_FILTERS: HomeFilterState = {
  sports: [],
  radius: 'all',
  when: { kind: 'all' },
  skill: '',
  joinMode: '',
  freeOnly: false,
  freeCost: false,
};

/** Сколько «дополнительных» фильтров включено (без спорта, радиуса и времени — они видны в баре). */
export const extraFilterCount = (f: HomeFilterState) =>
  (f.skill ? 1 : 0) + (f.joinMode ? 1 : 0) + (f.freeOnly ? 1 : 0) + (f.freeCost ? 1 : 0);

export const allFilterCount = (f: HomeFilterState) =>
  extraFilterCount(f) + (f.when.kind !== 'all' ? 1 : 0);

/* ---------- Поповер ---------- */

const Popover: React.FC<{
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  width: number;
  children: React.ReactNode;
}> = ({ open, onClose, trigger, width, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative shrink-0">
      {trigger}
      {open && (
        <div
          className="anim-fade absolute top-[calc(100%+8px)] left-0 z-50 bg-card border border-line-2 rounded-xl shadow-[0_4px_16px_rgba(20,30,45,0.14)]"
          style={{ width }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Изменённый фильтр выделяется рамкой цвета бренда с подсветкой-тенью
const barButton = (open: boolean, active = false) =>
  `h-10 pl-3 pr-2.5 flex items-center gap-[7px] rounded-[10px] text-[15px] text-ink whitespace-nowrap transition-all ${
    active
      ? 'border-2 border-brand bg-surface shadow-[0_0_12px_rgba(4,215,147,0.35)] dark:shadow-[0_0_12px_rgba(213,244,91,0.25)]'
      : 'border border-line-2'
  } ${open && !active ? 'bg-surface' : !active ? 'bg-card hover:bg-surface' : ''}`;

/** Прямоугольный чип-пресет (вместо «таблетки» Chip). */
const PresetChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`h-9 px-3 rounded-lg border text-sm font-semibold whitespace-nowrap transition-all ${
      active
        ? 'bg-brand text-on-brand border-brand shadow-[0_2px_12px_rgba(4,215,147,0.4)] dark:shadow-[0_2px_12px_rgba(213,244,91,0.3)] font-bold'
        : 'bg-card border-line-2 text-ink hover:bg-surface'
    }`}
  >
    {children}
  </button>
);

/** Сегментированный выбор в шите «Фильтры». */
function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-[3px] p-[3px] bg-surface rounded-[10px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex-1 min-w-0 h-[42px] px-1 rounded-lg text-sm sm:text-[15px] font-semibold truncate transition-all ${
              on
                ? 'bg-card text-ink border border-brand/60 shadow-[0_0_12px_rgba(4,215,147,0.3)] dark:shadow-[0_0_12px_rgba(213,244,91,0.25)] font-bold'
                : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Радиус ---------- */

export const RadiusList: React.FC<{
  value: Radius;
  /** null — количество неизвестно (например, «без ограничения» при поиске в радиусе) */
  counts: Record<Radius, number | null>;
  onChange: (r: Radius) => void;
}> = ({ value, counts, onChange }) => (
  <div className="flex flex-col p-1.5" role="listbox" aria-label="Радиус">
    {RADIUS_OPTIONS.map((o) => {
      const on = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          role="option"
          aria-selected={on}
          onClick={() => onChange(o.value)}
          className={`h-11 px-2.5 flex items-center gap-2.5 rounded-lg text-base font-semibold text-ink text-left ${
            on ? 'bg-surface' : 'hover:bg-surface/60'
          }`}
        >
          <span className="flex-1">{o.label}</span>
          <span className="text-sm font-medium text-muted">{counts[o.value]}</span>
          <span className="w-[18px] flex text-brand-ink">{on && <Check className="w-[18px] h-[18px]" />}</span>
        </button>
      );
    })}
  </div>
);

/* ---------- Вид спорта: один компактный фильтр вместо ряда чипов ---------- */

export const sportsLabel = (selected: string[], sports: Sport[]) => {
  if (selected.length === 0) return 'Все виды';
  if (selected.length === 1) return sports.find((s) => s.slug === selected[0])?.name ?? '1 вид';
  return `${selected.length} вида`;
};

export const SportList: React.FC<{
  selected: string[];
  sports: Sport[];
  onChange: (slugs: string[]) => void;
}> = ({ selected, sports, onChange }) => {
  const toggle = (slug: string) =>
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  return (
    <div className="flex flex-col gap-2 p-1.5">
      <div className="grid grid-cols-2 gap-1 max-h-[320px] overflow-y-auto" role="group" aria-label="Вид спорта">
        {sports.map((s) => {
          const on = selected.includes(s.slug);
          return (
            <button
              key={s.slug}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.slug)}
              className={`h-[42px] px-3 flex items-center gap-1.5 rounded-lg text-[15px] font-semibold text-left transition-all ${
                on
                  ? 'bg-brand text-on-brand shadow-[0_2px_10px_rgba(4,215,147,0.35)] dark:shadow-[0_2px_10px_rgba(213,244,91,0.25)] font-bold'
                  : 'text-ink hover:bg-surface'
              }`}
            >
              <span className="flex-1 truncate">{s.name}</span>
              {on && <Check className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="h-10 rounded-lg text-[15px] font-bold text-brand-ink underline underline-offset-[3px] hover:bg-surface transition-colors"
        >
          Сбросить выбор
        </button>
      )}
    </div>
  );
};

/* ---------- Когда: пресеты + календарь-интервал ---------- */

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const Calendar: React.FC<{ when: When; eventDays: Set<number>; onChange: (w: When) => void }> = ({
  when,
  eventDays,
  onChange,
}) => {
  const [offset, setOffset] = useState(() => {
    if (when.kind !== 'range') return 0;
    const now = new Date();
    const d = keyToDate(when.from);
    return Math.max(0, Math.min(2, (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth()));
  });
  // «День» — одно нажатие выбирает один день; «Период» — начало и конец интервала
  const [mode, setMode] = useState<'day' | 'range'>(() => (when.kind === 'range' && when.to != null ? 'range' : 'day'));
  const now = new Date();
  const today = dayKey(now);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const a = when.kind === 'range' ? when.from : null;
  const b = when.kind === 'range' ? (when.to ?? when.from) : null;

  const pick = (k: number) => {
    if (mode === 'day') return onChange({ kind: 'range', from: k, to: null });
    // Период: первое нажатие — начало интервала, второе — конец
    if (when.kind !== 'range' || when.to != null) return onChange({ kind: 'range', from: k, to: null });
    if (k < when.from) return onChange({ kind: 'range', from: k, to: when.from });
    onChange({ kind: 'range', from: when.from, to: k === when.from ? null : k });
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-[10px] bg-surface">
      <div role="group" aria-label="Режим выбора даты" className="grid grid-cols-2 gap-1 p-1 rounded-[10px] bg-card">
        {(['day', 'range'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              // Из «Периода» в «День» оставляем только первый день
              if (m === 'day' && when.kind === 'range' && when.to != null) onChange({ kind: 'range', from: when.from, to: null });
            }}
            className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
              mode === m ? 'bg-ink text-page' : 'text-muted hover:text-ink'
            }`}
          >
            {m === 'day' ? 'День' : 'Период'}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          aria-label="Предыдущий месяц"
          className="w-10 h-10 rounded-lg bg-card text-ink disabled:opacity-40 flex items-center justify-center"
        >
          <ChevronLeft className="w-[18px] h-[18px]" />
        </button>
        <span className="text-base font-bold text-ink">
          {MONTHS[first.getMonth()]} {first.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(2, o + 1))}
          disabled={offset === 2}
          aria-label="Следующий месяц"
          className="w-10 h-10 rounded-lg bg-card text-ink disabled:opacity-40 flex items-center justify-center"
        >
          <ChevronRight className="w-[18px] h-[18px]" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-[13px] font-semibold text-muted text-center">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`l${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const k = dayKey(new Date(first.getFullYear(), first.getMonth(), i + 1));
          const past = k < today;
          const end = k === a || k === b;
          const inRange = a != null && b != null && k > a && k < b;
          const radius = end && a !== b ? (k === a ? 'rounded-l-[10px]' : 'rounded-r-[10px]') : end ? 'rounded-[10px]' : '';
          return (
            <button
              key={k}
              type="button"
              disabled={past}
              onClick={() => pick(k)}
              aria-pressed={end || inRange}
              aria-label={keyToDate(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              className={`relative h-10 text-[15px] ${k === today ? 'font-extrabold' : 'font-semibold'} ${radius} transition-all ${
                end
                  ? 'bg-brand text-on-brand shadow-[0_2px_10px_rgba(4,215,147,0.4)] dark:shadow-[0_2px_10px_rgba(213,244,91,0.3)] font-bold'
                  : inRange
                    ? 'bg-surface-2 text-ink'
                    : past
                      ? 'text-muted/50'
                      : 'text-ink hover:bg-card'
              }`}
            >
              {i + 1}
              {eventDays.has(k) && (
                <span
                  className={`absolute bottom-[5px] left-1/2 -ml-0.5 w-1 h-1 rounded-full ${end ? 'bg-on-brand' : 'bg-brand'}`}
                />
              )}
            </button>
          );
        })}
      </div>
      <span className="text-[13px] leading-snug font-medium text-muted">
        {a == null
          ? mode === 'day'
            ? 'Нажмите на день, чтобы показать события этой даты'
            : 'Выберите период: первое нажатие — начало, второе — конец'
          : `Выбрано: ${whenLabel(when)}. Точкой отмечены дни с событиями`}
      </span>
    </div>
  );
};

export const WhenPicker: React.FC<{ when: When; eventDays: Set<number>; onChange: (w: When) => void }> = ({
  when,
  eventDays,
  onChange,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-1.5">
      {whenPresets().map((p) => (
        <PresetChip key={p.label} active={sameWhen(p.when, when)} onClick={() => onChange(p.when)}>
          {p.label}
        </PresetChip>
      ))}
    </div>
    <Calendar when={when} eventDays={eventDays} onChange={onChange} />
  </div>
);

/* ---------- Иконка фильтров ---------- */

export const FilterIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);

export const CountBadge: React.FC<{ n: number; className?: string }> = ({ n, className = '' }) =>
  n > 0 ? (
    <span
      className={`min-w-[22px] h-[22px] px-1.5 rounded-md bg-brand text-on-brand shadow-[0_1px_6px_rgba(4,215,147,0.35)] dark:shadow-[0_1px_6px_rgba(213,244,91,0.25)] text-[13px] font-bold leading-[22px] text-center ${className}`}
    >
      {n}
    </span>
  ) : null;

/* ---------- Десктопный фильтр-бар ---------- */

export const FilterBar: React.FC<{
  filters: HomeFilterState;
  onChange: (patch: Partial<HomeFilterState>) => void;
  sports: Sport[];
  radiusCounts: Record<Radius, number | null>;
  eventDays: Set<number>;
  resultCount: number;
  onOpenFilters: () => void;
  canUseRadius: boolean;
  /** Что отличается от значений по умолчанию: рамка у кнопки и «Сбросить всё» */
  changed: { radius: boolean; when: boolean; sport: boolean; any: boolean };
  onResetAll: () => void;
}> = ({ filters, onChange, sports, radiusCounts, eventDays, resultCount, onOpenFilters, canUseRadius, changed, onResetAll }) => {
  const [pop, setPop] = useState<'radius' | 'when' | 'sport' | null>(null);
  const close = () => setPop(null);

  return (
    <div className="relative z-30 shrink-0 h-[60px] px-6 flex items-center gap-2 bg-card border-b border-line-2">
      <Popover
        open={pop === 'radius'}
        onClose={close}
        width={260}
        trigger={
          <button type="button" onClick={() => setPop(pop === 'radius' ? null : 'radius')} className={barButton(pop === 'radius', changed.radius)}>
            <LocateFixed className="w-[18px] h-[18px]" />
            <span className="text-muted">Радиус</span>
            <span className="font-bold">{radiusValue(filters.radius)}</span>
            <ChevronDown className="w-4 h-4 text-muted" />
          </button>
        }
      >
        {!canUseRadius && (
          <p className="px-4 pt-3 text-[13px] text-muted leading-snug">
            Радиус считается от вашей геопозиции или от домашнего города из профиля.
          </p>
        )}
        <RadiusList
          value={filters.radius}
          counts={radiusCounts}
          onChange={(radius) => {
            onChange({ radius });
            close();
          }}
        />
      </Popover>

      <Popover
        open={pop === 'when'}
        onClose={close}
        width={340}
        trigger={
          <button type="button" onClick={() => setPop(pop === 'when' ? null : 'when')} className={barButton(pop === 'when', changed.when)}>
            <CalendarDays className="w-[18px] h-[18px]" />
            <span className="text-muted">Когда</span>
            <span className="font-bold">{whenLabel(filters.when)}</span>
            <ChevronDown className="w-4 h-4 text-muted" />
          </button>
        }
      >
        <div className="p-3 flex flex-col gap-3">
          <WhenPicker when={filters.when} eventDays={eventDays} onChange={(when) => onChange({ when })} />
          <button
            type="button"
            onClick={close}
            className="h-[46px] rounded-[10px] bg-brand text-on-brand text-base font-bold hover:bg-brand-hover"
          >
            {resultCount ? `Показать ${resultCount}` : 'Нет подходящих событий'}
          </button>
        </div>
      </Popover>

      <span className="shrink-0 w-px h-6 bg-line-2 mx-1" />

      <Popover
        open={pop === 'sport'}
        onClose={close}
        width={320}
        trigger={
          <button type="button" onClick={() => setPop(pop === 'sport' ? null : 'sport')} className={barButton(pop === 'sport', changed.sport)}>
            <span className="text-muted">Спорт</span>
            <span className="font-bold max-w-[150px] truncate">{sportsLabel(filters.sports, sports)}</span>
            <ChevronDown className={`w-4 h-4 text-muted transition-transform ${pop === 'sport' ? 'rotate-180' : ''}`} />
          </button>
        }
      >
        <SportList selected={filters.sports} sports={sports} onChange={(s) => onChange({ sports: s })} />
      </Popover>

      <div className="flex-1" />

      {changed.any && (
        <button
          type="button"
          onClick={onResetAll}
          className="h-10 px-2.5 text-[15px] font-bold text-brand-ink underline underline-offset-[3px] hover:text-ink"
        >
          Сбросить всё
        </button>
      )}

      <button type="button" onClick={onOpenFilters} className={`${barButton(false, extraFilterCount(filters) > 0)} gap-2 font-semibold`}>
        <FilterIcon size={18} />
        Фильтры
        <CountBadge n={extraFilterCount(filters)} />
      </button>
    </div>
  );
};

/* ---------- Шит «Фильтры» ---------- */

export const FiltersSheet: React.FC<{
  filters: HomeFilterState;
  onChange: (patch: Partial<HomeFilterState>) => void;
  onReset: () => void;
  onClose: () => void;
  sports: Sport[];
  eventDays: Set<number>;
  resultCount: number;
  /** На десктопе «Когда» и «Радиус» живут в баре — в шите их не дублируем */
  compact: boolean;
}> = ({ filters, onChange, onReset, onClose, sports, eventDays, resultCount, compact }) => {
  return (
    <Modal
      title="Фильтры"
      onClose={onClose}
      headerAction={
        <button type="button" onClick={onReset} className="h-10 px-2.5 text-base font-bold text-brand-ink underline underline-offset-[3px] hover:text-ink">
          Сбросить
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        {!compact && (
          <div className="flex flex-col gap-2.5">
            <SectionLabel>Когда</SectionLabel>
            <WhenPicker when={filters.when} eventDays={eventDays} onChange={(when) => onChange({ when })} />
          </div>
        )}
        {!compact && (
          <div className="flex flex-col gap-2.5">
            <SectionLabel>Радиус от вас</SectionLabel>
            <Seg
              label="Радиус"
              value={filters.radius}
              onChange={(radius) => onChange({ radius })}
              options={RADIUS_OPTIONS.map((o) => ({ value: o.value, label: o.value === 'all' ? 'Все' : o.label }))}
            />
          </div>
        )}
        {!compact && (
          <div className="flex flex-col gap-2.5">
            <SectionLabel>Спорт</SectionLabel>
            <SportList selected={filters.sports} sports={sports} onChange={(s) => onChange({ sports: s })} />
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <SectionLabel>Уровень</SectionLabel>
          <Seg
            label="Уровень"
            value={filters.skill || 'all'}
            onChange={(v) => onChange({ skill: v === 'all' ? '' : (v as SkillLevel) })}
            options={[
              { value: 'all', label: 'Любой' },
              ...(['NOVICE', 'AMATEUR', 'PRO'] as SkillLevel[]).map((s) => ({ value: s, label: SKILL_LABELS[s] })),
            ]}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <SectionLabel>Запись</SectionLabel>
          <Seg
            label="Запись"
            value={filters.joinMode || 'all'}
            onChange={(v) => onChange({ joinMode: v === 'all' ? '' : (v as JoinMode) })}
            options={[
              { value: 'all', label: 'Любая' },
              { value: 'OPEN', label: 'Свободная' },
              { value: 'APPROVAL', label: 'По заявке' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Toggle checked={filters.freeOnly} onChange={(freeOnly) => onChange({ freeOnly })}>
            Только со свободными местами
          </Toggle>
          <Toggle checked={filters.freeCost} onChange={(freeCost) => onChange({ freeCost })}>
            Только бесплатные
          </Toggle>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-[52px] rounded-xl bg-brand text-on-brand text-[17px] font-bold hover:bg-brand-hover transition-colors"
        >
          {resultCount ? `Показать ${resultCount}` : 'Нет подходящих событий'}
        </button>
      </div>
    </Modal>
  );
};
