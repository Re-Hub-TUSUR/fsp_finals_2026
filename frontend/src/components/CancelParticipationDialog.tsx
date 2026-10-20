import React from 'react';
import type { ParticipationStatus } from '../types';
import { Modal } from './Modal';

/** Подтверждение отмены участия: текст зависит от статуса (заявка, очередь, запись). */
export const CancelParticipationDialog: React.FC<{
  status: ParticipationStatus;
  eventTitle: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ status, eventTitle, busy, error, onConfirm, onClose }) => {
  const pending = status === 'PENDING';
  const waitlisted = status === 'WAITLISTED';
  return (
    <Modal title={pending ? 'Отозвать заявку?' : waitlisted ? 'Выйти из очереди?' : 'Отменить участие?'} onClose={onClose}>
      <p className="text-ink font-semibold mb-2">{eventTitle}</p>
      <p className="text-muted mb-5">
        {pending
          ? 'Организатор больше не увидит вашу заявку. Позже можно подать её снова.'
          : waitlisted
            ? 'Вы больше не будете получать уведомления об освободившихся местах. Позже можно встать в очередь снова.'
            : 'Место освободится для других участников. Позже можно записаться снова, если останутся места.'}
      </p>
      {error && <p role="alert" className="text-sm text-red-700 mb-3">{error}</p>}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button onClick={onClose} className="px-5 py-3 rounded-xl border border-line-2 font-semibold text-ink hover:bg-surface">
          Назад
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-[#fff] font-semibold disabled:opacity-60"
        >
          {pending ? 'Отозвать' : waitlisted ? 'Выйти из очереди' : 'Отменить участие'}
        </button>
      </div>
    </Modal>
  );
};
