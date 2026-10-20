import React from 'react';
import { cn } from '../../utils/cn';

/** Полоса вкладок с подчёркиванием; на узком экране прокручивается горизонтально. */
export function Tabs({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex border-b border-slate-200 gap-3 sm:gap-6 mb-6 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'pb-3 text-sm sm:text-base font-semibold border-b-2 transition-colors shrink-0 whitespace-nowrap flex items-center gap-2',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        active ? 'border-brand text-brand-ink' : 'border-transparent text-slate-500 hover:text-slate-800',
      )}
    >
      {children}
    </button>
  );
}
