import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, LocateFixed } from 'lucide-react';
import type { JoinMode, SkillLevel, Sport } from '../types';
import { SKILL_LABELS } from '../utils/format';
import { dayKey, keyToDate, sameWhen, whenLabel, whenPresets, type When } from '../utils/eventView';
import { Modal } from './Modal';
import { Chip, SectionLabel, Segmented, Toggle } from './ui';

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
  extraFilterCount(f) + f.sports.length + (f.when.kind !== 'all' ? 1 : 0);

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
          className="anim-drop absolute top-[calc(100%+8px)] left-0 z-50 origin-top-left bg-white border border-line rounded-[20px] shadow-[0_18px_48px_rgba(6,12,30,0.22)]"
          style={{ width }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const barButton = (open: boolean) =>
  `h-10 pl-3 pr-2.5 flex items-center gap-[7px] border border-line rounded-xl text-sm text-ink whitespace-nowrap transition-colors ${
    open ? 'bg-surface' : 'bg-white hover:bg-surface'
  }`;

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
          className={`h-11 px-3 flex items-center gap-2.5 rounded-xl text-sm font-semibold text-ink text-left ${
            on ? 'bg-surface' : 'hover:bg-surface/60'
          }`}
        >
          <span className="flex-1">{o.label}</span>
          <span className="text-[13px] font-medium text-muted">{counts[o.value]}</span>
          <span className="w-[18px] flex text-brand-ink">{on && <Check className="w-[18px] h-[18px]" />}</span>
        </button>
      );
    })}
  </div>
);

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
  const now = new Date();
  const today = dayKey(now);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const a = when.kind === 'range' ? when.from : null;
  const b = when.kind === 'range' ? (when.to ?? when.from) : null;

  const pick = (k: number) => {
    // Первое нажатие — начало интервала, второе — конец
    if (when.kind !== 'range' || when.to != null) return onChange({ kind: 'range', from: k, to: null });
    if (k < when.from) return onChange({ kind: 'range', from: k, to: when.from });
    onChange({ kind: 'range', from: when.from, to: k === when.from ? null : k });
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-[18px] bg-surface">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          aria-label="Предыдущий месяц"
          className="w-10 h-10 rounded-xl bg-white text-ink disabled:text-line flex items-center justify-center"
        >
          <ChevronLeft className="w-[18px] h-[18px]" />
        </button>
        <span className="text-[15px] font-bold text-ink">
          {MONTHS[first.getMonth()]} {first.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(2, o + 1))}
          disabled={offset === 2}
          aria-label="Следующий месяц"
          className="w-10 h-10 rounded-xl bg-white text-ink disabled:text-line flex items-center justify-center"
        >
          <ChevronRight className="w-[18px] h-[18px]" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-[11px] font-semibold text-muted text-center">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`l${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const k = dayKey(new Date(first.getFullYear(), first.getMonth(), i + 1));
          const past = k < today;
          const end = k === a || k === b;
          const inRange = a != null && b != null && k > a && k < b;
          const radius = end && a !== b ? (k === a ? 'rounded-l-xl' : 'rounded-r-xl') : end ? 'rounded-xl' : '';
          return (
            <button
              key={k}
              type="button"
              disabled={past}
              onClick={() => pick(k)}
              aria-pressed={end || inRange}
              aria-label={keyToDate(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              className={`relative h-10 text-sm ${k === today ? 'font-extrabold' : 'font-semibold'} ${radius} ${
                end ? 'bg-ink text-white' : inRange ? 'bg-surface-2 text-ink' : past ? 'text-muted/50' : 'text-ink hover:bg-white'
              }`}
            >
              {i + 1}
              {eventDays.has(k) && (
                <span
                  className={`absolute bottom-[5px] left-1/2 -ml-0.5 w-1 h-1 rounded-full ${end ? 'bg-white' : 'bg-brand'}`}
                />
              )}
            </button>
          );
        })}
      </div>
      <span className="text-xs leading-snug font-medium text-muted">
        {a == null
          ? 'Выберите дату или интервал: первое нажатие — начало, второе — конец'
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
        <Chip key={p.label} size="sm" active={sameWhen(p.when, when)} onClick={() => onChange(p.when)}>
          {p.label}
        </Chip>
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
    <span className={`min-w-5 h-5 px-1.5 rounded-full bg-ink text-white text-[11px] font-bold leading-5 text-center ${className}`}>
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
}> = ({ filters, onChange, sports, radiusCounts, eventDays, resultCount, onOpenFilters, canUseRadius }) => {
  const [pop, setPop] = useState<'radius' | 'when' | null>(null);
  const close = () => setPop(null);
  const toggleSport = (slug: string) =>
    onChange({
      sports: filters.sports.includes(slug) ? filters.sports.filter((s) => s !== slug) : [...filters.sports, slug],
    });

  return (
    <div className="relative z-30 shrink-0 h-16 px-6 flex items-center gap-2.5 bg-white border-b border-line">
      <Popover
        open={pop === 'radius'}
        onClose={close}
        width={260}
        trigger={
          <button type="button" onClick={() => setPop(pop === 'radius' ? null : 'radius')} className={barButton(pop === 'radius')}>
            <LocateFixed className="w-[18px] h-[18px] text-muted" />
            <span className="text-muted">Радиус</span>
            <span className="font-bold">{radiusValue(filters.radius)}</span>
            <ChevronDown className="w-4 h-4 text-muted" />
          </button>
        }
      >
        {!canUseRadius && (
          <p className="px-4 pt-3 text-xs text-muted leading-snug">
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
          <button type="button" onClick={() => setPop(pop === 'when' ? null : 'when')} className={barButton(pop === 'when')}>
            <CalendarDays className="w-[18px] h-[18px] text-muted" />
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
            className="h-11 rounded-[14px] bg-brand text-on-brand text-[15px] font-bold hover:bg-brand-hover"
          >
            {resultCount ? `Показать ${resultCount}` : 'Нет подходящих событий'}
          </button>
        </div>
      </Popover>

      <span className="shrink-0 w-px h-6 bg-line mx-1" />

      <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar [mask-image:linear-gradient(90deg,#000_92%,transparent)]">
        <Chip active={filters.sports.length === 0} onClick={() => onChange({ sports: [] })}>
          Все виды
        </Chip>
        {sports.map((s) => (
          <Chip key={s.slug} active={filters.sports.includes(s.slug)} onClick={() => toggleSport(s.slug)}>
            {s.name}
          </Chip>
        ))}
      </div>

      <button type="button" onClick={onOpenFilters} className={`${barButton(false)} font-semibold`}>
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
  const toggleSport = (slug: string) =>
    onChange({
      sports: filters.sports.includes(slug) ? filters.sports.filter((s) => s !== slug) : [...filters.sports, slug],
    });
  return (
    <Modal
      title="Фильтры"
      onClose={onClose}
      headerAction={
        <button type="button" onClick={onReset} className="h-10 px-3 rounded-xl text-[15px] font-semibold text-brand-ink hover:bg-surface">
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
            <Segmented
              label="Радиус"
              value={filters.radius}
              onChange={(radius) => onChange({ radius })}
              options={RADIUS_OPTIONS.map((o) => ({ value: o.value, label: o.value === 'all' ? 'Все' : o.label }))}
            />
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <SectionLabel>Вид спорта</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {sports.map((s) => (
              <Chip key={s.slug} active={filters.sports.includes(s.slug)} onClick={() => toggleSport(s.slug)}>
                {s.name}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <SectionLabel>Уровень</SectionLabel>
          <Segmented
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
          <Segmented
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
          className="h-14 rounded-[18px] bg-brand text-on-brand text-[17px] font-bold hover:bg-brand-hover transition-colors"
        >
          {resultCount ? `Показать ${resultCount}` : 'Нет подходящих событий'}
        </button>
      </div>
    </Modal>
  );
};
