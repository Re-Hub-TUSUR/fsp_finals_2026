import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** Действие справа от заголовка (например, «Сбросить») */
  headerAction?: React.ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Диалог: на мобильном — шит снизу (радиус 28), на десктопе — по центру. */
/** Фокус заходит в диалог и остаётся в нём, фон inert, по закрытии фокус возвращается на инициатора. */
export const Modal: React.FC<ModalProps> = ({ title, onClose, children, wide, headerAction }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;

    // Фон недоступен для фокуса и скринридера, пока диалог открыт
    const inerted: HTMLElement[] = [];
    for (const el of Array.from(document.body.children) as HTMLElement[]) {
      if (el.contains(dialog) || el.inert) continue;
      el.inert = true;
      inerted.push(el);
    }

    // Начальный фокус — на диалог (а не на фоновую кнопку), чтобы Tab шёл по его содержимому
    dialog?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      for (const el of inerted) el.inert = false;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-modal bg-[rgba(4,6,10,0.5)] flex items-end sm:items-center justify-center p-0 sm:p-4"
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
