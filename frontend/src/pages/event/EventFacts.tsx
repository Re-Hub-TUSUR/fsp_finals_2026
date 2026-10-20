import React from 'react';
import {
  Banknote,
  Building2,
  CalendarPlus,
  Clock,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Trophy,
  User as UserIcon,
  Users,
} from 'lucide-react';
import type { SportEvent } from '../../types';
import { MiniMap } from '../../components/MiniMap';
import { RouteButton } from '../../components/RouteButton';
import { useEventWeather } from '../../components/EventWeather';
import { displayValue } from '../../components/FieldInput';
import { Badge } from '../../components/ui';
import {
  JOIN_MODE_LABELS,
  formatAges,
  formatDateTime,
  formatPrice,
  formatShortDateTime,
  formatTime,
  isForeignZone,
  utcLabel,
} from '../../utils/format';

const cardClass = 'bg-card rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm';

const Fact: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span>
    <div>
      <div className="text-sm text-slate-500 font-semibold">{label}</div>
      <div className="text-base text-slate-900">{children}</div>
    </div>
  </div>
);

const WeatherFact: React.FC<{ event: SportEvent }> = ({ event }) => {
  const weather = useEventWeather(event);
  if (!weather) return null;
  return (
    <Fact icon={<weather.Icon className="w-5 h-5" />} label="Погода в это время">
      {weather.title}
      <span className="block text-xs text-slate-500">{weather.details}</span>
    </Fact>
  );
};

/** «Основное»: время, место, погода, стоимость, запись, возраст и мини-карта. */
export const EventMainCard: React.FC<{ event: SportEvent }> = ({ event }) => {
  const ages = formatAges(event.minAge, event.maxAge);
  return (
    <div className={cardClass}>
      <h2 className="text-lg font-bold text-slate-900 mb-4">Основное</h2>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <Fact icon={<Clock className="w-5 h-5" />} label="Когда">
          {formatDateTime(event.startTime, event.timeZone)} – {formatTime(event.endTime, event.timeZone)}
          {event.recurrenceRule !== 'NONE' && event.recurrenceIntervalDays && (
            <span className="block text-sm font-semibold text-brand-ink">Повторяется через {event.recurrenceIntervalDays} дн.</span>
          )}
          {event.timeZone && isForeignZone(event.timeZone) && (
            <span className="block text-xs text-slate-500">
              Местное время{event.cityName ? `: ${event.cityName}` : ''} ({utcLabel(event.timeZone)})
            </span>
          )}
        </Fact>
        <Fact icon={<MapPin className="w-5 h-5" />} label="Где">
          {event.address}
          <RouteButton lat={event.lat} lng={event.lng} className="mt-2" />
        </Fact>
        <WeatherFact event={event} />
        <Fact icon={<Banknote className="w-5 h-5" />} label="Стоимость">
          {formatPrice(event.price)}
        </Fact>
        <Fact icon={<UserIcon className="w-5 h-5" />} label="Запись">
          {JOIN_MODE_LABELS[event.joinMode]}
        </Fact>
        {ages && (
          <Fact icon={<Users className="w-5 h-5" />} label="Возраст">
            {ages}
          </Fact>
        )}
        {event.registrationDeadline && (
          <Fact icon={<CalendarPlus className="w-5 h-5" />} label="Приём заявок до">
            {formatShortDateTime(event.registrationDeadline, event.timeZone)}
          </Fact>
        )}
        {event.requiredEquipment && (
          <div className="sm:col-span-2">
            <Fact icon={<FileText className="w-5 h-5" />} label="Что взять с собой">
              {event.requiredEquipment}
            </Fact>
          </div>
        )}
      </div>
      <div className="mt-5 space-y-2">
        <MiniMap lat={event.lat} lng={event.lng} />
      </div>
    </div>
  );
};

/** Поля шаблона мероприятия и произвольные поля организатора. */
export const EventDetailsCard: React.FC<{ event: SportEvent }> = ({ event }) => {
  const templateFacts = (event.fields ?? [])
    .map((f) => ({ field: f, text: displayValue(f, event.details?.[f.key]) }))
    .filter((x) => x.text !== null);
  if (templateFacts.length === 0 && (event.customFields?.length ?? 0) === 0) return null;

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-bold text-slate-900 mb-4">
        {event.template && event.template.code !== 'free' ? event.template.name : 'Детали'}
      </h2>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
        {templateFacts.map(({ field, text }) => (
          <div key={field.key} className={field.type === 'TEXTAREA' ? 'sm:col-span-2' : ''}>
            <dt className="text-sm text-slate-500 font-semibold">{field.label}</dt>
            <dd className="text-base text-slate-900 whitespace-pre-line">{text}</dd>
          </div>
        ))}
        {event.customFields?.map((f, i) => (
          <div key={`c${i}`}>
            <dt className="text-sm text-slate-500 font-semibold">{f.label}</dt>
            <dd className="text-base text-slate-900">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mt-5">
    <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
    {children}
  </div>
);

/** Сведения организации-организатора: контакты, требования, программа, удобства. */
export const OrgDetailsCard: React.FC<{ org: NonNullable<SportEvent['orgDetails']> }> = ({ org }) => (
  <div className={cardClass}>
    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
      <Building2 className="w-5 h-5 text-slate-500" /> Сведения организатора
    </h2>
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
      {org.contactName && (
        <Fact icon={<UserIcon className="w-5 h-5" />} label="Контактное лицо">
          {org.contactName}
        </Fact>
      )}
      {org.contactPhone && (
        <Fact icon={<Phone className="w-5 h-5" />} label="Телефон">
          <a href={`tel:${org.contactPhone.replace(/[^+\d]/g, '')}`} className="text-brand-ink hover:underline">
            {org.contactPhone}
          </a>
        </Fact>
      )}
      {org.contactEmail && (
        <Fact icon={<Mail className="w-5 h-5" />} label="E-mail">
          <a href={`mailto:${org.contactEmail}`} className="text-brand-ink hover:underline break-all">
            {org.contactEmail}
          </a>
        </Fact>
      )}
      {org.website && (
        <Fact icon={<Globe className="w-5 h-5" />} label="Сайт / регламент">
          <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-brand-ink hover:underline break-all">
            {org.website}
          </a>
        </Fact>
      )}
      {org.venueName && (
        <Fact icon={<MapPin className="w-5 h-5" />} label="Площадка">
          {org.venueName}
        </Fact>
      )}
      {org.prizes && (
        <Fact icon={<Trophy className="w-5 h-5" />} label="Призы">
          {org.prizes}
        </Fact>
      )}
    </div>

    {(org.medicalCertificateRequired || org.insuranceRequired || (org.requiredDocuments?.length ?? 0) > 0) && (
      <Section title="Требования к участникам">
        <div className="flex flex-wrap gap-2">
          {org.medicalCertificateRequired && <Badge tone="warning">Медицинская справка</Badge>}
          {org.insuranceRequired && <Badge tone="warning">Страховка</Badge>}
          {org.requiredDocuments?.map((d) => (
            <Badge key={d} tone="warning">
              {d}
            </Badge>
          ))}
        </div>
      </Section>
    )}

    {(org.program?.length ?? 0) > 0 && (
      <Section title="Программа">
        <ol className="border-l-2 border-brand-line ml-2 space-y-2.5">
          {org.program!.map((p, i) => (
            <li key={i} className="pl-4 relative">
              <span className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-brand border-2 border-white" />
              {p.time && <span className="font-semibold text-slate-900 mr-2">{p.time}</span>}
              <span className="text-slate-700">{p.title}</span>
            </li>
          ))}
        </ol>
      </Section>
    )}

    {(org.facilities?.length ?? 0) > 0 && (
      <Section title="На площадке">
        <div className="flex flex-wrap gap-2">
          {org.facilities!.map((f) => (
            <Badge key={f}>{f}</Badge>
          ))}
        </div>
      </Section>
    )}

    {org.cancellationPolicy && (
      <Section title="Условия отмены">
        <p className="text-slate-700">{org.cancellationPolicy}</p>
      </Section>
    )}
    {org.sponsors && (
      <Section title="Партнёры">
        <p className="text-slate-700">{org.sponsors}</p>
      </Section>
    )}
  </div>
);
