import React from 'react';

/** Базовые элементы дизайн-системы: чип, сегментный переключатель, тумблер. */

export const Chip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  floating?: boolean;
}> = ({ active, onClick, children, size = 'md', floating = false }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`shrink-0 rounded-full border font-semibold whitespace-nowrap transition-colors ${
      size === 'sm' ? 'h-[34px] px-3 text-[13px]' : 'h-9 px-3.5 text-sm'
    } ${floating ? 'shadow-[0_2px_8px_rgba(10,20,45,0.10)]' : ''} ${
      // В Sportikus Home активные чипы «чернильные»: акцент остаётся только за действиями
      active ? 'bg-ink border-ink text-white' : 'bg-card border-line text-ink hover:bg-surface'
    }`}
  >
    {children}
  </button>
);

export function Segmented<T extends string>({
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
    <div role="radiogroup" aria-label={label} className="flex gap-1 p-1 bg-surface rounded-[14px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 min-w-0 h-10 px-1 rounded-[10px] text-[13px] sm:text-sm font-semibold truncate transition-all ${
              active ? 'bg-white text-ink shadow-[0_1px_4px_rgba(10,20,45,0.16)]' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }> = ({
  checked,
  onChange,
  children,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="w-full min-h-11 flex items-center justify-between gap-3 text-left text-base font-semibold text-ink"
  >
    {children}
    <span className={`relative shrink-0 w-[52px] h-8 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-surface-2'}`}>
      <span
        className={`absolute top-[3px] w-[26px] h-[26px] rounded-full bg-snow shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-[left] ${
          checked ? 'left-[23px]' : 'left-[3px]'
        }`}
      />
    </span>
  </button>
);

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[13px] font-semibold text-muted uppercase tracking-[0.08em]">{children}</span>
);
