import React from 'react';
import { buttonClasses, type ButtonSize, type ButtonStyleOptions } from './buttonStyles';
import { Spinner } from './Spinner';

const SPINNER_SIZES: Record<ButtonSize, 'sm' | 'md'> = { sm: 'sm', md: 'sm', lg: 'md' };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, Omit<ButtonStyleOptions, 'className'> {
  /** Показывает спиннер и блокирует повторное нажатие. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size = 'md', block, loading = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, block, className })}
      {...rest}
    >
      {loading && <Spinner size={SPINNER_SIZES[size]} />}
      {children}
    </button>
  );
});
