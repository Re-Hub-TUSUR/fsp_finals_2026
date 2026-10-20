import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const SIZES = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7', xl: 'w-8 h-8' } as const;

/**
 * Индикатор загрузки. С `label` — самостоятельный статус для скринридеров,
 * без него — декоративная иконка внутри кнопки или строки.
 */
export function Spinner({
  size = 'md',
  label,
  className,
}: {
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  const icon = <Loader2 className={cn(SIZES[size], 'animate-spin', className)} aria-hidden="true" />;
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Спиннер по центру области — пока грузится страница или список. */
export function LoadingBlock({ label = 'Загрузка', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex justify-center py-20 text-muted', className)}>
      <Spinner size="xl" label={label} />
    </div>
  );
}
