import React from 'react';

/** Переключатели дизайн-системы: чип, тумблер, подпись секции. */

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
      size === 'sm' ? 'h-[34px] px-3 text-label' : 'h-9 px-3.5 text-sm'
    } ${floating ? 'shadow-[0_2px_8px_rgba(10,20,45,0.10)]' : ''} ${
      // В Sportikus Home активные чипы «чернильные»: акцент остаётся только за действиями
      active ? 'bg-ink border-ink text-white' : 'bg-card border-line text-ink hover:bg-surface'
    }`}
  >
    {children}
  </button>
);

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
  <span className="text-label font-semibold text-muted uppercase tracking-[0.08em]">{children}</span>
);
