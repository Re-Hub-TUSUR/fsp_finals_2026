import React, { useState } from 'react';
import { Calendar, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import type { FieldValues, SportEvent } from '../types';
import { participationApi } from '../api';
import { errorMessage } from '../api/client';
import { Modal } from './Modal';
import { FieldInput, inputClass, labelClass, pruneValues } from './FieldInput';
import { formatPrice, formatShortDateTime } from '../utils/format';

interface JoinDialogProps {
  event: SportEvent;
  onClose: () => void;
  /** Вызывается после успешной отправки, чтобы страница перечитала состояние. */
  onDone: () => void;
}

/**
 * Подтверждение участия. Участник видит, что именно подтверждает: время, место, цену,
 * требования организатора и отвечает на анкету. При режиме «по заявке» решение примет организатор.
 */
export const JoinDialog: React.FC<JoinDialogProps> = ({ event, onClose, onDone }) => {
  const needsApproval = event.joinMode === 'APPROVAL';
  const org = event.orgDetails;
  const hasRequirements =
    !!org && (org.medicalCertificateRequired || org.insuranceRequired || (org.requiredDocuments?.length ?? 0) > 0);
  const questions = event.registrationFields ?? [];

  const [answers, setAnswers] = useState<FieldValues>({});
  const [message, setMessage] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    for (const q of questions) {
      const v = answers[q.key];
      if (q.required && (v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0))) {
        return setError(`Ответьте на вопрос «${q.label}»`);
      }
    }
    if (hasRequirements && !accepted) return setError('Подтвердите, что ознакомились с требованиями организатора');

    setSubmitting(true);
    try {
      await participationApi.join(event.id, {
        message: message.trim() || undefined,
        answers: pruneValues(answers),
        acceptedRequirements: hasRequirements ? true : undefined,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title={needsApproval ? 'Подать заявку' : 'Записаться'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5">
          <div className="font-bold text-slate-900">{event.title}</div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 shrink-0" />
            {formatShortDateTime(event.startTime, event.timeZone)}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 shrink-0" />
            {event.address}
          </div>
          <div className="text-sm text-slate-600">
            Стоимость: <b>{formatPrice(event.price)}</b>
          </div>
        </div>

        <div
          className={`flex gap-3 rounded-xl border p-4 text-sm ${
            needsApproval ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            {needsApproval
              ? 'Организатор рассмотрит заявку и подтвердит участие. Место закрепляется только после подтверждения — статус будет виден в карточке и в «Моих событиях».'
              : 'Вход свободный: вы будете записаны сразу и займёте место.'}
          </p>
        </div>

        {questions.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Анкета участника</h4>
            {questions.map((q) => (
              <FieldInput
                key={q.key}
                field={q}
                value={answers[q.key]}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
              />
            ))}
          </div>
        )}

        {needsApproval && (
          <div>
            <label htmlFor="join-message" className={labelClass}>
              Сообщение организатору
            </label>
            <textarea
              id="join-message"
              rows={2}
              maxLength={500}
              placeholder="Необязательно: расскажите о себе или задайте вопрос"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {hasRequirements && org && (
          <label className="flex items-start gap-3 rounded-xl border border-slate-300 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-5 h-5 mt-0.5 accent-emerald-600 shrink-0"
            />
            <span className="text-sm text-slate-800">
              Я ознакомился(-ась) с требованиями организатора:
              <ul className="list-disc ml-5 mt-1 text-slate-600">
                {org.medicalCertificateRequired && <li>медицинская справка</li>}
                {org.insuranceRequired && <li>страховка</li>}
                {org.requiredDocuments?.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </span>
          </label>
        )}

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {needsApproval ? 'Отправить заявку' : 'Подтвердить запись'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
