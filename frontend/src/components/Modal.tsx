import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** Действие справа от заголовка (например, «Сбросить») */
  headerAction?: React.ReactNode;
}

/** Диалог: на мобильном — шит снизу (радиус 28), на десктопе — по центру. */
/** Фокус заходит в диалог и остаётся в нём, фон inert, по закрытии фокус возвращается на инициатора. */
export const Modal: React.FC<ModalProps> = ({ title, onClose, children, wide, headerAction }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, onClose);

  return createPortal(
    <div
      className="fixed inset-0 z-modal bg-scrim flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`outline-none bg-card w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-sheet sm:rounded-3xl shadow-card`}
      >
        <div className="sticky top-0 bg-card z-10 px-5 pt-2.5 pb-3">
          <div className="w-10 h-[5px] rounded-full bg-surface-2 mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-extrabold text-2xl tracking-[-0.02em] text-ink">{title}</h3>
            <div className="flex items-center gap-1">
              {headerAction}
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-10 h-10 rounded-xl bg-surface text-ink flex items-center justify-center hover:bg-surface-2"
              >
                <X className="w-4 h-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
