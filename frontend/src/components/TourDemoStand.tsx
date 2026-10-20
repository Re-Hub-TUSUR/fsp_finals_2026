import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CalendarDays, Check, Clock, MapPin, QrCode, Ticket, Users } from 'lucide-react';

/**
 * Показательный стенд записи на мероприятие для обучающего тура: карточка → заявка → QR-билет.
 * Это макет на вымышленных данных — ничего не отправляется на сервер, кнопки не нажимаются.
 */

export type TourDemoKind = 'event' | 'form' | 'ticket';

export const DEMO_TICKET_CODE = 'SPT-DEMO2026';

const DEMO_EVENT = {
  sport: 'Бег',
  title: 'Утренняя пробежка в парке',
  when: 'Суббота, 08:00 (местное)',
  place: 'Центральный парк, у главного входа',
  organizer: 'Беговой клуб «Рассвет»',
};

/** Поля заявки в порядке заполнения: так видно, как выглядит готовая анкета. */
const DEMO_FIELDS = [
  { label: 'Ваш уровень', value: 'Новичок' },
  { label: 'Вопрос организатора: сколько км вы пробегаете?', value: '3–5 км' },
  { label: 'Сообщение организатору', value: 'Бегу впервые в компании — подскажете темп?' },
];

const reducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const StandFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    role="group"
    aria-label="Демонстрационный пример, ничего не отправляется"
    className="relative mb-3 rounded-2xl border border-dashed border-brand-line bg-surface p-2.5 sm:p-3"
  >
    <span className="absolute -top-2.5 left-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-on-brand">
      Пример
    </span>
    {children}
  </div>
);

/** Неактивная «кнопка» макета — выглядит как настоящая, но это не элемент управления. */
const FakeButton: React.FC<{ children: React.ReactNode; pulse?: boolean }> = ({ children, pulse }) => (
  <span className="relative mt-2.5 flex h-9 sm:h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand text-xs sm:text-sm font-bold text-on-brand">
    {children}
    {pulse && (
      <span className="absolute -right-1 -top-1 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-card bg-brand" />
      </span>
    )}
  </span>
);

const EventDemo: React.FC = () => (
  <StandFrame>
    <div className="rounded-xl border border-line bg-card p-3">
      <span className="rounded bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand-ink">{DEMO_EVENT.sport}</span>
      <p className="mt-1.5 text-sm sm:text-base font-extrabold leading-snug text-ink">{DEMO_EVENT.title}</p>
      <p className="text-[11px] sm:text-xs text-muted">{DEMO_EVENT.organizer}</p>
      <ul className="mt-2 space-y-1 text-[11px] sm:text-xs text-ink">
        <li className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted" />{DEMO_EVENT.when}</li>
        <li className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-muted" />{DEMO_EVENT.place}</li>
        <li className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0 text-muted" />Свободно 5 мест из 12 · идёт Ольга из ваших друзей</li>
      </ul>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] sm:text-[11px] font-semibold">
        <span className="rounded-full bg-surface px-2 py-0.5 text-ink">Уровень: новичок</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-ink">Бесплатно</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-ink">С собой: кроссовки, вода</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-ink">Запись по заявке</span>
      </div>
      <FakeButton pulse>Записаться</FakeButton>
    </div>
  </StandFrame>
);

const FormDemo: React.FC = () => {
  // Поля заполняются по одному, чтобы был виден порядок; без анимаций — сразу целиком
  const total = DEMO_FIELDS.length + 1;
  const [filled, setFilled] = useState(() => (reducedMotion() ? total : 0));
  useEffect(() => {
    if (filled >= total) return;
    const timer = setTimeout(() => setFilled((n) => n + 1), filled === 0 ? 350 : 650);
    return () => clearTimeout(timer);
  }, [filled, total]);

  const agreed = filled > DEMO_FIELDS.length;
  return (
    <StandFrame>
      <div className="rounded-xl border border-line bg-card p-3">
        <p className="text-xs sm:text-sm font-extrabold text-ink">Заявка на «{DEMO_EVENT.title}»</p>
        <div className="mt-2 space-y-2">
          {DEMO_FIELDS.map((field, i) => (
            <div key={field.label}>
              <span className="block text-[10px] sm:text-[11px] font-semibold text-muted">{field.label}</span>
              <span
                className={`mt-0.5 flex min-h-8 items-center rounded-lg border px-2.5 py-1 text-[11px] sm:text-xs transition-colors ${
                  i < filled ? 'border-brand bg-brand-tint/40 text-ink' : 'border-line-2 bg-surface text-muted'
                }`}
              >
                {i < filled ? field.value : 'заполняется…'}
              </span>
            </div>
          ))}
          <span className="flex items-center gap-2 text-[11px] sm:text-xs text-ink">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                agreed ? 'border-brand bg-brand text-on-brand' : 'border-line-2 bg-card'
              }`}
            >
              {agreed && <Check className="h-3 w-3" />}
            </span>
            С условиями и требованиями организатора ознакомлен(а)
          </span>
        </div>
        <FakeButton pulse={agreed}>Отправить заявку</FakeButton>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold text-muted">
          <Clock className="h-3.5 w-3.5" /> Дальше: «Заявка на рассмотрении» → «Вы участвуете»
        </p>
      </div>
    </StandFrame>
  );
};

const TicketDemo: React.FC<{ participantName: string }> = ({ participantName }) => {
  const [qrSvg, setQrSvg] = useState('');
  useEffect(() => {
    // SVG, а не canvas: QR рисуется без лишних зависимостей и одинаково в любой теме
    QRCode.toString(DEMO_TICKET_CODE, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQrSvg)
      .catch(() => setQrSvg(''));
  }, []);

  return (
    <StandFrame>
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="bg-brand px-3 py-2 text-on-brand">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider">
            <Ticket className="h-3 w-3" /> Электронный билет · бесплатный вход
          </span>
          <p className="text-xs sm:text-sm font-extrabold leading-snug">{DEMO_EVENT.title}</p>
        </div>
        <div className="flex items-center gap-3 p-3">
          <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-lg border border-line bg-[#ffffff] p-1">
            {qrSvg ? (
              <img src={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`} alt={`Пример QR-кода билета ${DEMO_TICKET_CODE}`} className="h-full w-full" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[#98a0a9]"><QrCode className="h-8 w-8" /></span>
            )}
          </div>
          <div className="min-w-0 space-y-1 text-[11px] sm:text-xs">
            <code className="inline-block rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono font-extrabold tracking-wider text-ink">
              {DEMO_TICKET_CODE}
            </code>
            <p className="text-muted">Участник: <b className="text-ink">{participantName}</b></p>
            <p className="text-muted">{DEMO_EVENT.when}</p>
            <p className="truncate text-muted">{DEMO_EVENT.place}</p>
          </div>
        </div>
      </div>
    </StandFrame>
  );
};

export const TourDemoStand: React.FC<{ kind: TourDemoKind; participantName?: string }> = ({ kind, participantName }) =>
  kind === 'event' ? <EventDemo /> : kind === 'form' ? <FormDemo /> : <TicketDemo participantName={participantName || 'Вы'} />;
