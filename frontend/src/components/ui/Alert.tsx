import React from 'react';
import { cn } from '../../utils/cn';

const TONES = {
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  brand: 'bg-brand-tint border-brand-line text-brand-ink',
  danger: 'bg-red-50 border-red-200 text-red-900',
} as const;

/** Блок-пояснение над формой или разделом: иконка, заголовок и текст. */
export function Alert({
  tone,
  icon,
  title,
  className,
  children,
}: {
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={cn('p-4 border rounded-xl flex items-start gap-3', TONES[tone], className)}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="text-base">
        <b>{title}</b>
        <div className="text-sm mt-0.5 opacity-90">{children}</div>
      </div>
    </div>
  );
}
