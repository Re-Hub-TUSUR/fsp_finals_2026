import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { catalogApi, eventsApi } from '../api';
import { errorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import type { EventTemplate, Sport } from '../types';
import { FieldInput } from '../components/FieldInput';
import { Alert, Button, buttonClasses } from '../components/ui';
import { QuestionsEditor } from '../components/constructor/QuestionsEditor';
import { CustomFieldsEditor } from '../components/constructor/CustomFieldsEditor';
import { OrgDetailsForm } from '../components/constructor/OrgDetailsForm';
import { autoRejectReason } from '../utils/moderation';
import { buildEventPayload, eventFormReducer, initialEventForm, validateEventForm, type EventForm } from './create/eventForm';
import { useVenueLocation } from './create/useVenueLocation';
import { BasicsSection, FormSection, ParticipationSection, ScheduleSection, TemplatePicker } from './create/FormSections';

const NO_TEMPLATES: EventTemplate[] = [];
const NO_SPORTS: Sport[] = [];

export const CreateEventPage: React.FC = () => {
  const { currentUser, ready, preferences } = useAuth();
  const navigate = useNavigate();

  const catalog = useApi(() => Promise.all([catalogApi.templates(), catalogApi.sports()]), []);
  const [templates, sports] = catalog.data ?? [NO_TEMPLATES, NO_SPORTS];

  const [form, dispatch] = useReducer(eventFormReducer, undefined, () => initialEventForm());
  const update = (patch: Partial<EventForm>) => dispatch({ type: 'update', patch });
  const venue = useVenueLocation(form.address, preferences?.homeCity);

  const [submitting, setSubmitting] = useState(false);
  /** Мероприятие сохранено, но автопроверка его не пропустила. */
  const [rejected, setRejected] = useState<{ id: number; reason?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOrg = currentUser?.role === 'ROLE_ORGANIZER';
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const orgBlocked = isOrg && currentUser?.orgStatus !== 'APPROVED';
  const blocked = !currentUser || isAdmin || orgBlocked;

  const availableTemplates = useMemo(() => templates.filter((t) => !t.organizationOnly || isOrg), [templates, isOrg]);
  const standardSports = useMemo(() => sports.filter((s) => !s.custom), [sports]);

  // Первый шаблон («Свободный формат») выбираем автоматически
  const firstTemplate = availableTemplates[0];
  useEffect(() => {
    if (!form.template && firstTemplate) dispatch({ type: 'template', template: firstTemplate, sports });
  }, [form.template, firstTemplate, sports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked || !form.template) return;
    const zone = venue.venueCity?.timeZone;
    const problem = validateEventForm(form, zone);
    setError(problem);
    if (problem) return;

    setSubmitting(true);
    setRejected(null);
    try {
      // В ответе уже итог автопроверки: сомнительное мероприятие ИИ проверяет за несколько секунд
      const created = await eventsApi.create(buildEventPayload(form, { coords: venue.coords, zone, asOrganization: isOrg }));
      if (created.status === 'UNPUBLISHED') {
        setRejected({ id: created.id, reason: autoRejectReason(created.unpublishReason) });
        setSubmitting(false);
        return;
      }
      navigate(`/events/${created.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  const { template } = form;
  const banner = 'mb-5';

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 w-full min-w-0 overflow-x-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{isOrg ? 'Мероприятие от организации' : 'Создать мероприятие'}</h1>
      <p className="text-sm sm:text-base text-slate-500 mb-6">
        Выберите готовый формат и заполните только нужное — сборка мероприятия займёт пару минут.
      </p>

      {!currentUser && (
        <Alert tone="warning" className={banner} icon={<AlertTriangle className="w-5 h-5" />} title="Нужно войти">
          Выберите роль в верхней панели, чтобы создавать мероприятия.
        </Alert>
      )}
      {isAdmin && (
        <Alert tone="warning" className={banner} icon={<ShieldAlert className="w-5 h-5" />} title="Администратор не создаёт мероприятия">
          Он модерирует площадку. Переключитесь на пользователя или организацию.
        </Alert>
      )}
      {orgBlocked && (
        <Alert tone="warning" className={banner} icon={<AlertTriangle className="w-5 h-5" />} title="Публикация пока недоступна">
          {currentUser?.orgStatus === 'REJECTED'
            ? `Заявка организации отклонена${currentUser.orgRejectReason ? `: ${currentUser.orgRejectReason}` : '.'}`
            : `Организация «${currentUser?.organizationName ?? ''}» ожидает одобрения администратора. После допуска публикация будет мгновенной, без премодерации.`}
        </Alert>
      )}
      {isOrg && !orgBlocked && (
        <Alert
          tone="brand"
          className={banner}
          icon={<Building2 className="w-5 h-5" />}
          title={`Публикуете от имени «${currentUser?.organizationName ?? ''}»`}
        >
          Организация одобрена — мероприятие появится на карте сразу. Заполните блок с данными организатора в конце формы.
        </Alert>
      )}
      {catalog.error && (
        <Alert tone="danger" className={banner} icon={<AlertTriangle className="w-5 h-5" />} title="Не удалось загрузить конструктор">
          {catalog.error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset disabled={blocked || submitting} className="space-y-5 min-w-0">
          <TemplatePicker
            templates={availableTemplates}
            selected={template}
            onSelect={(t) => dispatch({ type: 'template', template: t, sports })}
          />
          <BasicsSection form={form} update={update} sports={standardSports} />
          <ScheduleSection
            form={form}
            update={update}
            onStartChange={(value) => dispatch({ type: 'start', value })}
            coords={venue.coords}
            onPick={venue.pick}
            venueCity={venue.venueCity}
            addressSearch={venue.addressSearch}
          />
          <ParticipationSection form={form} update={update} />

          {template && template.fields.length > 0 && (
            <FormSection n={5} title={`Параметры: ${template.name.toLowerCase()}`} hint="Поля этого формата.">
              <div className="grid sm:grid-cols-2 gap-4">
                {template.fields.map((f) => (
                  <div key={f.key} className={f.type === 'TEXTAREA' || f.type === 'MULTISELECT' ? 'sm:col-span-2' : ''}>
                    <FieldInput
                      field={f}
                      value={form.details[f.key]}
                      onChange={(v) => update({ details: { ...form.details, [f.key]: v } })}
                    />
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          <FormSection n={6} title="Свои параметры" hint="Всё, чего нет в формате: взнос, дресс-код, парковка… Появится в карточке мероприятия.">
            <CustomFieldsEditor fields={form.customFields} onChange={(customFields) => update({ customFields })} />
          </FormSection>

          <FormSection n={7} title="Анкета для участников" hint="Вопросы, на которые человек ответит, подавая заявку. Ответы увидите только вы.">
            <QuestionsEditor questions={form.questions} onChange={(questions) => update({ questions })} />
          </FormSection>

          {isOrg && (
            <FormSection
              n={8}
              title="Данные организатора"
              hint="Обязательны для мероприятий организаций: участники увидят контакты, требования и программу."
            >
              <OrgDetailsForm value={form.orgDetails} onChange={(orgDetails) => update({ orgDetails })} />
            </FormSection>
          )}
        </fieldset>

        {error && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-base">
            {error}
          </div>
        )}

        {rejected && (
          <Alert tone="danger" icon={<ShieldAlert className="w-5 h-5" />} title="Мероприятие не прошло автоматическую проверку и не опубликовано">
            {rejected.reason && <p className="mt-1">Причина: {rejected.reason}</p>}
            <p className="mt-2">
              На Sportikus публикуются мероприятия о спорте, активном отдыхе и здоровом образе жизни. Исправьте описание и отправьте
              снова. Если считаете, что это ошибка, — администратор увидит мероприятие и может вернуть его.
            </p>
            <Link to="/my" className="inline-block mt-2 font-semibold underline">
              Мои события
            </Link>
          </Alert>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Link to="/" className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'border-slate-300 text-slate-700 hover:bg-slate-50 shadow-none' })}>
            Отмена
          </Link>
          <Button
            type="submit"
            size="lg"
            disabled={blocked || !template}
            loading={submitting}
            className="disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {submitting ? 'Публикуем и проверяем…' : 'Опубликовать мероприятие'}
          </Button>
        </div>
        {submitting && (
          <p className="text-sm text-slate-500 text-right" aria-live="polite">
            Мероприятие проходит автоматическую проверку — обычно это несколько секунд.
          </p>
        )}
      </form>
    </div>
  );
};
