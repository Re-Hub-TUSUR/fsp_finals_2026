import React from 'react';
import { cn } from '../../utils/cn';

const TONES = {
  neutral: 'bg-slate-50 border-slate-200 text-slate-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  brand: 'bg-brand-tint border-brand-line text-brand-ink',
  danger: 'bg-red-50 border-red-200 text-red-800',
} as const;

export type BadgeTone = keyof typeof TONES;

/** Статичная метка-«таблетка»: требования, теги, статусы. */
export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return <span className={cn('text-sm px-3 py-1 rounded-full border', TONES[tone], className)}>{children}</span>;
}

/** Счётчик на вкладке или кнопке («3 новых»). */
export function CountBadge({ className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('bg-amber-500 text-snow text-xs font-bold px-2 py-0.5 rounded-full', className)} {...rest}>
      {children}
    </span>
  );
}
