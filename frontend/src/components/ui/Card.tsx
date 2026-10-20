import React from 'react';
import { cn } from '../../utils/cn';

/** Базовая поверхность: карточка с рамкой. Отступы задаёт вызывающий код. */
export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-card border border-line rounded-2xl', className)} {...rest} />;
}
