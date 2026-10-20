import React from 'react';

/** Сообщение об ошибке с кнопкой «Повторить» — чтобы сбой сети не был тупиком. */
export const ErrorNotice: React.FC<{
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ message, onRetry, className = '' }) => (
  <div
    role="alert"
    className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm ${className}`}
  >
    <span className="min-w-0">{message}</span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 h-8 px-3 rounded-lg bg-white border border-red-200 font-semibold text-red-800 hover:bg-red-100"
      >
        Повторить
      </button>
    )}
  </div>
);
