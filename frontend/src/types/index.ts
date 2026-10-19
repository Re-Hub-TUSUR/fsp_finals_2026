export type Role = 'ROLE_USER' | 'ROLE_ORGANIZER' | 'ROLE_ADMIN';
export type OrgStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
  organizationId?: number;
  organizationName?: string;
  orgStatus?: OrgStatus;
  orgRejectReason?: string;
}

export interface Sport {
  id: number;
  name: string;
  slug: string;
  custom: boolean;
}

export type JoinMode = 'OPEN' | 'APPROVAL';
export type SkillLevel = 'NOVICE' | 'AMATEUR' | 'PRO' | 'ANY';
export type EventStatus = 'PUBLISHED' | 'UNPUBLISHED' | 'CANCELLED';
export type ParticipationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

/** Конструктор: описание одного поля формы (поле шаблона или вопрос участнику). */
export type FieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  unit?: string;
  placeholder?: string;
  help?: string;
}

export type FieldValue = string | number | boolean | string[] | undefined;
export type FieldValues = Record<string, FieldValue>;

export interface CustomField {
  label: string;
  value: string;
}

export interface EventTemplate {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  organizationOnly: boolean;
  suggestedSportSlug?: string;
  defaultCapacity: number;
  defaultJoinMode: JoinMode;
  defaultSkillLevel: SkillLevel;
  defaultDurationMinutes: number;
  fields: FieldDef[];
  registrationFields: FieldDef[];
}

export interface ProgramItem {
  time?: string;
  title: string;
}

/** Сведения, которые указывает организация. */
export interface OrgDetails {
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  venueName?: string;
  requiredDocuments?: string[];
  medicalCertificateRequired?: boolean;
  insuranceRequired?: boolean;
  prizes?: string;
  program?: ProgramItem[];
  facilities?: string[];
  cancellationPolicy?: string;
  sponsors?: string;
}

export interface ParticipationBrief {
  id: number;
  status: ParticipationStatus;
  message?: string;
  decisionComment?: string;
  createdAt: string;
}

export interface SportEvent {
  id: number;
  title: string;
  description?: string;
  sport: Sport;
  template?: { id: number; code: string; name: string; icon?: string };
  organizerName: string;
  organizerAvatar?: string;
  byOrganization: boolean;
  organizationId?: number;
  startTime: string;
  endTime: string;
  lat: number;
  lng: number;
  address: string;
  capacity: number;
  confirmedCount: number;
  joinMode: JoinMode;
  skillLevel: SkillLevel;
  price?: number;
  registrationDeadline?: string;
  minAge?: number;
  maxAge?: number;
  requiredEquipment?: string;
  status: EventStatus;
  unpublishReason?: string;

  // только в карточке
  fields?: FieldDef[];
  details?: Record<string, FieldValue>;
  customFields?: CustomField[];
  registrationFields?: FieldDef[];
  orgDetails?: OrgDetails;

  // контекст текущего пользователя
  myParticipation?: ParticipationBrief;
  canManage?: boolean;
  pendingCount?: number;
}

export interface Participation {
  id: number;
  status: ParticipationStatus;
  message?: string;
  answers?: Record<string, FieldValue>;
  decisionComment?: string;
  createdAt: string;
  decidedAt?: string;
  user?: { id: number; fullName: string; avatarUrl?: string };
  event?: SportEvent;
}

export interface AdminOrganization {
  id: number;
  name: string;
  description?: string;
  status: OrgStatus;
  rejectReason?: string;
  logoUrl?: string;
  ownerName: string;
  ownerEmail: string;
}

/** Тело запроса на создание мероприятия. */
export interface CreateEventPayload {
  title: string;
  description?: string;
  sportId?: number;
  customSportName?: string;
  templateId?: number;
  startTime: string;
  endTime: string;
  lat: number;
  lng: number;
  address: string;
  capacity: number;
  joinMode: JoinMode;
  skillLevel: SkillLevel;
  requiredEquipment?: string;
  price?: number;
  registrationDeadline?: string;
  minAge?: number;
  maxAge?: number;
  details: FieldValues;
  customFields: CustomField[];
  registrationFields: FieldDef[];
  orgDetails?: OrgDetails;
}

export interface JoinPayload {
  message?: string;
  answers?: FieldValues;
  acceptedRequirements?: boolean;
}
