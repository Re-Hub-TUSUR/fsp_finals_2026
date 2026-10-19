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

export interface Profile {
  id: number;
  type: 'USER' | 'ORGANIZATION';
  name: string;
  email: string;
  description?: string;
  imageUrl?: string;
  inn?: string;
  ogrn?: string;
  kpp?: string;
  status?: OrgStatus;
  canEdit: boolean;
  friendshipState?: FriendshipState;
  events: SportEvent[];
}

export type FriendshipState = 'NONE' | 'OUTGOING_PENDING' | 'INCOMING_PENDING' | 'FRIENDS';

export interface FriendRequest {
  userId: number;
  fullName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Friend {
  userId: number;
  fullName: string;
  avatarUrl?: string;
  friendsSince?: string;
}

export interface Sport {
  id: number;
  name: string;
  slug: string;
  custom: boolean;
}

export type JoinMode = 'OPEN' | 'APPROVAL';
export type SkillLevel = 'NOVICE' | 'AMATEUR' | 'PRO' | 'ANY';
export type EventStatus = 'PUBLISHED' | 'UNPUBLISHED' | 'CANCELLED' | 'MODERATION' | 'ARCHIVED';

/** Автопроверка мероприятия: фильтр запрещённых тем → при сомнении проверка ИИ. */
export type ModerationStatus = 'CLEAN' | 'PENDING' | 'FLAGGED' | 'REJECTED' | 'REVIEWED';
export type ModerationCategory =
  | 'POLITICS'
  | 'ALCOHOL'
  | 'TOBACCO'
  | 'DRUGS'
  | 'GAMBLING'
  | 'DISCRIMINATION'
  | 'VIOLENCE'
  | 'ADULT'
  | 'FRAUD'
  | 'PROFANITY'
  | 'TOPIC';

export interface EventModeration {
  status: ModerationStatus;
  reason?: string;
  hits: { category: ModerationCategory; term: string; field: string }[];
  model?: string;
  checkedAt?: string;
}
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
  organizerUserId?: number;
  startTime: string;
  endTime: string;
  lat: number;
  lng: number;
  address: string;
  /** Ближайший город и местный часовой пояс места проведения. */
  cityName?: string;
  timeZone?: string;
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
  friendsAttending?: FriendAttendee[];
  myParticipation?: ParticipationBrief;
  canManage?: boolean;
  pendingCount?: number;

  /** Результат автопроверки — приходит только администратору. */
  moderation?: EventModeration;
}

export interface FriendAttendee {
  id: number;
  fullName: string;
  avatarUrl?: string;
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

// ------------------------------------------------------------- рекомендации

export interface City {
  id: number;
  name: string;
  region?: string;
  lat: number;
  lng: number;
  timeZone: string;
}

export type PreferredTime = 'MORNING' | 'DAY' | 'EVENING' | 'WEEKEND';

/** Интересы и предпочтения пользователя (форма регистрации и профиль). */
export interface Preferences {
  sports: Sport[];
  skillLevel?: SkillLevel;
  homeCity?: City;
  homeLat?: number;
  homeLng?: number;
  maxDistanceKm: number;
  preferredTimes: PreferredTime[];
  maxPrice?: number;
  birthYear?: number;
  configured: boolean;
}

export interface UpdatePreferencesPayload {
  sportIds: number[];
  skillLevel?: SkillLevel;
  homeCityId?: number;
  homeLat?: number;
  homeLng?: number;
  maxDistanceKm?: number;
  preferredTimes: PreferredTime[];
  maxPrice?: number;
  birthYear?: number;
}

export interface RecommendationReason {
  code: string;
  text: string;
}

export interface RecommendationItem {
  event: SportEvent;
  score: number;
  reasons: RecommendationReason[];
  sources: string[];
  breakdown: Record<string, number>;
}

export interface Recommendations {
  requestId: string;
  model: string;
  location?: { lat: number; lng: number; source: 'GEO' | 'HOME' | 'CITY'; cityName?: string; radiusKm: number };
  coldStart: boolean;
  needsLocation: boolean;
  items: RecommendationItem[];
  generatedAt: string;
}

export interface EventComment {
  id: number;
  eventId: number;
  eventTitle: string;
  authorId: number;
  authorName: string;
  authorRole: Role;
  authorAvatarUrl?: string;
  text: string;
  organizer: boolean;
  hidden: boolean;
  createdAt: string;
}
