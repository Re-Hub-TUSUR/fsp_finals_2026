import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { catalogApi, eventsApi } from '../api';
import { errorMessage } from '../api/client';
import type {
  CreateEventPayload,
  CustomField,
  EventTemplate,
  FieldDef,
  FieldValues,
  JoinMode,
  OrgDetails,
  SkillLevel,
  Sport,
} from '../types';
import { FieldInput, inputClass, labelClass, pruneValues } from '../components/FieldInput';
import { LocationPicker } from '../components/LocationPicker';
import { QuestionsEditor } from '../components/constructor/QuestionsEditor';
import { CustomFieldsEditor } from '../components/constructor/CustomFieldsEditor';
import { OrgDetailsForm } from '../components/constructor/OrgDetailsForm';
import { JOIN_MODE_LABELS, SKILL_LABELS, localInputToIso, toLocalInput } from '../utils/format';

const KRASNOYARSK: [number, number] = [56.0153, 92.8932];

const Section: React.FC<{ n: number; title: string; hint?: string; children: React.ReactNode }> = ({
  n,
  title,
  hint,
  children,
}) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
    <div className="flex items-start gap-3 mb-4">
      <span className="w-8 h-8 shrink-0 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
        {n}
      </span>
      <div>
        <h2 className="text-lg font-bold text-slate-900 leading-tight">{title}</h2>
        {hint && <p className="text-sm text-slate-500 mt-0.5">{hint}</p>}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

function defaultStart(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return d;
}

export const CreateEventPage: React.FC = () => {
  const { currentUser, ready } = useAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [template, setTemplate] = useState<EventTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportId, setSportId] = useState<number | ''>('');
  const [customSport, setCustomSport] = useState(false);
  const [customSportName, setCustomSportName] = useState('');

  const [start, setStart] = useState(() => toLocalInput(defaultStart()));
  const [end, setEnd] = useState(() => toLocalInput(new Date(defaultStart().getTime() + 2 * 3600000)));
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<[number, number]>(KRASNOYARSK);

  const [capacity, setCapacity] = useState(10);
  const [joinMode, setJoinMode] = useState<JoinMode>('APPROVAL');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('ANY');
  const [price, setPrice] = useState('');
  const [deadline, setDeadline] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [equipment, setEquipment] = useState('');

  const [details, setDetails] = useState<FieldValues>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [questions, setQuestions] = useState<FieldDef[]>([]);
  const [orgDetails, setOrgDetails] = useState<OrgDetails>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrg = currentUser?.role === 'ROLE_ORGANIZER';
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const orgBlocked = isOrg && currentUser?.orgStatus !== 'APPROVED';
  const blocked = !currentUser || isAdmin || orgBlocked;

  useEffect(() => {
    Promise.all([catalogApi.templates(), catalogApi.sports()])
      .then(([t, s]) => {
        setTemplates(t);
        setSports(s);
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, []);

  const availableTemplates = useMemo(
    () => templates.filter((t) => !t.organizationOnly || isOrg),
    [templates, isOrg],
  );

  const standardSports = useMemo(() => sports.filter((s) => !s.custom), [sports]);

  const applyTemplate = React.useCallback(
    (t: EventTemplate, allSports: Sport[]) => {
      setTemplate(t);
      setDetails({});
      setQuestions(t.registrationFields.map((q) => ({ ...q })));
      setCapacity(t.defaultCapacity);
      setJoinMode(t.defaultJoinMode);
      setSkillLevel(t.defaultSkillLevel);
      setEnd((prevEnd) => {
        const startDate = new Date(start);
        return Number.isNaN(startDate.getTime())
          ? prevEnd
          : toLocalInput(new Date(startDate.getTime() + t.defaultDurationMinutes * 60000));
      });
      const suggested = allSports.find((s) => s.slug === t.suggestedSportSlug);
      if (suggested) {
        setSportId(suggested.id);
        setCustomSport(false);
      }
    },
    [start],
  );

  // Первый шаблон («Свободный формат») выбираем автоматически
  useEffect(() => {
    if (!template && availableTemplates.length > 0) applyTemplate(availableTemplates[0], sports);
  }, [availableTemplates, sports, template, applyTemplate]);

  const onStartChange = (value: string) => {
    setStart(value);
    const startDate = new Date(value);
    if (template && !Number.isNaN(startDate.getTime())) {
      setEnd(toLocalInput(new Date(startDate.getTime() + template.defaultDurationMinutes * 60000)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked || !template) return;
    setError(null);

    const startIso = localInputToIso(start);
    const endIso = localInputToIso(end);
    if (!startIso || !endIso) return setError('Укажите дату и время начала и окончания');
    if (!customSport && sportId === '') return setError('Выберите вид спорта или введите свой');
    if (customSport && !customSportName.trim()) return setError('Введите название вида спорта');

    for (const f of template.fields) {
      const v = details[f.key];
      if (f.required && (v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || v === false)) {
        return setError(`Заполните поле «${f.label}»`);
      }
    }
    const cleanQuestions = questions.filter((q) => q.label.trim());
    for (const q of cleanQuestions) {
      if ((q.type === 'SELECT' || q.type === 'MULTISELECT') && !(q.options && q.options.length)) {
        return setError(`У вопроса «${q.label}» нужно указать варианты ответа`);
      }
    }

    const payload: CreateEventPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      sportId: customSport ? undefined : Number(sportId),
      customSportName: customSport ? customSportName.trim() : undefined,
      templateId: template.id,
      startTime: startIso,
      endTime: endIso,
      lat: coords[0],
      lng: coords[1],
      address: address.trim(),
      capacity,
      joinMode,
      skillLevel,
      requiredEquipment: equipment.trim() || undefined,
      price: price ? Number(price) : undefined,
      registrationDeadline: localInputToIso(deadline),
      minAge: minAge ? Number(minAge) : undefined,
      maxAge: maxAge ? Number(maxAge) : undefined,
      details: pruneValues(details),
      customFields: customFields
        .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
        .filter((f) => f.label && f.value),
      registrationFields: cleanQuestions.map((q) => ({
        ...q,
        label: q.label.trim(),
        options: q.type === 'SELECT' || q.type === 'MULTISELECT' ? q.options : undefined,
      })),
      orgDetails: isOrg
        ? {
            ...orgDetails,
            program: (orgDetails.program ?? []).filter((p) => p.title.trim()),
            medicalCertificateRequired: orgDetails.medicalCertificateRequired === true,
            insuranceRequired: orgDetails.insuranceRequired === true,
          }
        : undefined,
    };

    setSubmitting(true);
    try {
      const created = await eventsApi.create(payload);
      navigate(`/events/${created.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-1">
        {isOrg ? 'Мероприятие от организации' : 'Создать мероприятие'}
      </h1>
      <p className="text-base text-slate-500 mb-6">
        Выберите готовый формат и заполните только нужное — сборка мероприятия займёт пару минут.
      </p>

      {!currentUser && (
        <Banner tone="amber" icon={<AlertTriangle className="w-5 h-5" />} title="Нужно войти">
          Выберите роль в верхней панели, чтобы создавать мероприятия.
        </Banner>
      )}
      {isAdmin && (
        <Banner tone="amber" icon={<ShieldAlert className="w-5 h-5" />} title="Администратор не создаёт мероприятия">
          Он модерирует площадку. Переключитесь на пользователя или организацию.
        </Banner>
      )}
      {orgBlocked && (
        <Banner tone="amber" icon={<AlertTriangle className="w-5 h-5" />} title="Публикация пока недоступна">
          {currentUser?.orgStatus === 'REJECTED'
            ? `Заявка организации отклонена${currentUser.orgRejectReason ? `: ${currentUser.orgRejectReason}` : '.'}`
            : `Организация «${currentUser?.organizationName ?? ''}» ожидает одобрения администратора. После допуска публикация будет мгновенной, без премодерации.`}
        </Banner>
      )}
      {isOrg && !orgBlocked && (
        <Banner tone="emerald" icon={<Building2 className="w-5 h-5" />} title={`Публикуете от имени «${currentUser?.organizationName ?? ''}»`}>
          Организация одобрена — мероприятие появится на карте сразу. Заполните блок с данными организатора в конце формы.
        </Banner>
      )}
      {loadError && (
        <Banner tone="red" icon={<AlertTriangle className="w-5 h-5" />} title="Не удалось загрузить конструктор">
          {loadError}
        </Banner>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset disabled={blocked || submitting} className="space-y-5 min-w-0">
          <Section n={1} title="Формат мероприятия" hint="От формата зависят дополнительные поля и вопросы участникам.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableTemplates.map((t) => {
                const active = template?.id === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => applyTemplate(t, sports)}
                    aria-pressed={active}
                    className={`text-left rounded-xl border p-3.5 transition-all ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className="text-xl">{t.icon}</span>
                      {t.name}
                      {t.organizationOnly && (
                        <span className="text-[10px] uppercase tracking-wide bg-slate-900 text-white px-1.5 py-0.5 rounded">
                          для организаций
                        </span>
                      )}
                    </div>
                    {t.description && <p className="text-sm text-slate-500 mt-1">{t.description}</p>}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section n={2} title="Основное">
            <div>
              <label htmlFor="ev-title" className={labelClass}>
                Название <span className="text-red-500">*</span>
              </label>
              <input
                id="ev-title"
                type="text"
                required
                maxLength={150}
                placeholder="Например: Воркаут на набережной"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="ev-sport" className="text-sm font-semibold text-slate-700">
                  Вид спорта / активности <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCustomSport((v) => !v)}
                  className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  {customSport ? '← Выбрать из списка' : '+ Свой вид спорта'}
                </button>
              </div>
              {customSport ? (
                <input
                  id="ev-sport"
                  type="text"
                  maxLength={60}
                  placeholder="Например: Петанк, Падел, Скандинавская ходьба"
                  value={customSportName}
                  onChange={(e) => setCustomSportName(e.target.value)}
                  className={`${inputClass} border-emerald-400`}
                />
              ) : (
                <select
                  id="ev-sport"
                  value={sportId}
                  onChange={(e) => setSportId(e.target.value ? Number(e.target.value) : '')}
                  className={inputClass}
                >
                  <option value="">— выберите —</option>
                  {standardSports.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="ev-desc" className={labelClass}>
                Описание
              </label>
              <textarea
                id="ev-desc"
                rows={4}
                maxLength={5000}
                placeholder="Опишите формат встречи, план и что важно знать участникам"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
          </Section>

          <Section n={3} title="Когда и где" hint="Точку сбора можно выбрать кликом по карте.">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ev-start" className={labelClass}>
                  Начало <span className="text-red-500">*</span>
                </label>
                <input
                  id="ev-start"
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(e) => onStartChange(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ev-end" className={labelClass}>
                  Окончание <span className="text-red-500">*</span>
                </label>
                <input
                  id="ev-end"
                  type="datetime-local"
                  required
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="ev-address" className={labelClass}>
                Адрес места сбора <span className="text-red-500">*</span>
              </label>
              <input
                id="ev-address"
                type="text"
                required
                maxLength={300}
                placeholder="Красноярск, остров Татышев, павильон"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <LocationPicker lat={coords[0]} lng={coords[1]} onChange={(lat, lng) => setCoords([lat, lng])} />
            <p className="text-xs text-slate-500">
              Координаты: {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
            </p>
          </Section>

          <Section n={4} title="Участие" hint="Как люди попадают на мероприятие и сколько их может быть.">
            <div>
              <span className={labelClass}>Как записываются</span>
              <div className="grid sm:grid-cols-2 gap-3">
                {(['APPROVAL', 'OPEN'] as JoinMode[]).map((mode) => (
                  <label
                    key={mode}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      joinMode === mode
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="joinMode"
                      className="sr-only"
                      checked={joinMode === mode}
                      onChange={() => setJoinMode(mode)}
                    />
                    <div className="font-semibold text-slate-900">
                      {mode === 'APPROVAL' ? 'С подтверждением организатора' : JOIN_MODE_LABELS.OPEN}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {mode === 'APPROVAL'
                        ? 'Участник подаёт заявку, вы принимаете или отклоняете её.'
                        : 'Запись подтверждается сразу, пока есть свободные места.'}
                    </p>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ev-cap" className={labelClass}>
                  Количество мест
                </label>
                <input
                  id="ev-cap"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ev-skill" className={labelClass}>
                  Уровень подготовки
                </label>
                <select
                  id="ev-skill"
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                  className={inputClass}
                >
                  {(['ANY', 'NOVICE', 'AMATEUR', 'PRO'] as SkillLevel[]).map((s) => (
                    <option key={s} value={s}>
                      {SKILL_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ev-price" className={labelClass}>
                  Стоимость, ₽
                </label>
                <input
                  id="ev-price"
                  type="number"
                  min={0}
                  max={1000000}
                  placeholder="Бесплатно"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ev-min-age" className={labelClass}>
                  Возраст от
                </label>
                <input
                  id="ev-min-age"
                  type="number"
                  min={0}
                  max={120}
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ev-max-age" className={labelClass}>
                  Возраст до
                </label>
                <input
                  id="ev-max-age"
                  type="number"
                  min={0}
                  max={120}
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ev-deadline" className={labelClass}>
                  Приём заявок до
                </label>
                <input
                  id="ev-deadline"
                  type="datetime-local"
                  max={start}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ev-equipment" className={labelClass}>
                Что взять с собой
              </label>
              <input
                id="ev-equipment"
                type="text"
                maxLength={500}
                placeholder="Кроссовки, своя ракетка, вода"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className={inputClass}
              />
            </div>
          </Section>

          {template && template.fields.length > 0 && (
            <Section n={5} title={`Параметры: ${template.name.toLowerCase()}`} hint="Поля этого формата.">
              <div className="grid sm:grid-cols-2 gap-4">
                {template.fields.map((f) => (
                  <div key={f.key} className={f.type === 'TEXTAREA' || f.type === 'MULTISELECT' ? 'sm:col-span-2' : ''}>
                    <FieldInput field={f} value={details[f.key]} onChange={(v) => setDetails((d) => ({ ...d, [f.key]: v }))} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section n={6} title="Свои параметры" hint="Всё, чего нет в формате: взнос, дресс-код, парковка… Появится в карточке мероприятия.">
            <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
          </Section>

          <Section
            n={7}
            title="Анкета для участников"
            hint="Вопросы, на которые человек ответит, подавая заявку. Ответы увидите только вы."
          >
            <QuestionsEditor questions={questions} onChange={setQuestions} />
          </Section>

          {isOrg && (
            <Section
              n={8}
              title="Данные организатора"
              hint="Обязательны для мероприятий организаций: участники увидят контакты, требования и программу."
            >
              <OrgDetailsForm value={orgDetails} onChange={setOrgDetails} />
            </Section>
          )}
        </fieldset>

        {error && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-base">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Link
            to="/"
            className="text-center px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={blocked || submitting || !template}
            className={`px-6 py-3 rounded-xl font-semibold text-base shadow-sm flex items-center justify-center gap-2 ${
              blocked || submitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            Опубликовать мероприятие
          </button>
        </div>
      </form>
    </div>
  );
};

const TONES = {
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  red: 'bg-red-50 border-red-200 text-red-900',
} as const;

const Banner: React.FC<{
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ tone, icon, title, children }) => (
  <div className={`mb-5 p-4 border rounded-xl flex items-start gap-3 ${TONES[tone]}`}>
    <span className="shrink-0 mt-0.5">{icon}</span>
    <div className="text-base">
      <b>{title}</b>
      <p className="text-sm mt-0.5 opacity-90">{children}</p>
    </div>
  </div>
);
