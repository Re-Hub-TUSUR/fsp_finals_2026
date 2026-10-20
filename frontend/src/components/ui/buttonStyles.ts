import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover shadow-sm',
  secondary: 'bg-card text-ink border border-line hover:bg-surface',
  ghost: 'text-ink hover:bg-surface',
  danger: 'bg-red-600 text-snow hover:bg-red-700 shadow-sm',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

/** Классы кнопки — для `<Link>` и других элементов, которые должны выглядеть как кнопка. */
export function buttonClasses({ variant = 'primary', size = 'md', block = false, className }: ButtonStyleOptions = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
    className,
  );
}
