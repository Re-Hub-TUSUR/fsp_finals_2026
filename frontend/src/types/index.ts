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
  subscriberCount?: number;
  subscribed?: boolean;
  events: SportEvent[];
}

export interface Achievement {
  code: string; title: string; description: string; icon: string;
  progress: number; target: number; completed: boolean;
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

export interface FriendSearchResult {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
  state: FriendshipState;
  /** Найден аккаунт организации: дружбы нет, на неё подписываются */
  organizationId?: number | null;
}

export interface OrganizationSubscription {
  organizationId: number;
  name: string;
  imageUrl?: string;
  subscriberCount: number;
  subscribedAt: string;
}

export type NotificationType =
  | 'EVENT_INVITE'
  | 'PARTICIPATION_CONFIRMED'
  | 'PARTICIPATION_REJECTED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'NEW_COMMENT'
  | 'WAITLIST_SPOT_AVAILABLE'
  | 'WAITLIST_SPOT_TAKEN'
  | 'SYSTEM';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  senderUserId?: number;
  senderName?: string;
  senderAvatar?: string;
  eventId?: number;
  eventTitle?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  unreadCount: number;
  items: AppNotification[];
}

export interface InviteFriendsPayload {
  friendIds: number[];
  message?: string;
}

export interface InviteFriendsResult {
  invitedCount: number;
  invitedUserIds: number[];
  /** Уже звали на это мероприятие — повторно не отправлено. */
  alreadyInvitedIds: number[];
  /** Уже записаны, подали заявку, в очереди или организуют — не отправлено. */
  alreadyParticipatingIds: number[];
}

/** Можно ли позвать друга на мероприятие: AVAILABLE — можно, INVITED — уже звали, PARTICIPATING — уже идёт. */
export type InviteFriendState = 'AVAILABLE' | 'INVITED' | 'PARTICIPATING';

export interface InviteFriend {
  userId: number;
  fullName: string;
  avatarUrl?: string;
  state: InviteFriendState;
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
export type ParticipationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'WAITLISTED';

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
  /** NUMBER: границы (без min — 0) и признак «только целые» */
  min?: number;
  max?: number;
  integer?: boolean;
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
  ticketCode?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
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
  recurrenceRule?: 'NONE' | 'WEEKLY' | 'CUSTOM';
  recurrenceIntervalDays?: number;
  nextOccurrenceId?: number;
  lat: number;
  lng: number;
  address: string;
  /** Ближайший город и местный часовой пояс места проведения. */
  cityName?: string;
  timeZone?: string;
  capacity: number;
  confirmedCount: number;
  /** Сколько человек стоит в очереди на освободившееся место. */
  waitlistCount?: number;
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
  user?: { id: number; fullName: string; email?: string; avatarUrl?: string };
  event?: SportEvent;
  ticketCode?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}

export interface CheckInResult {
  success: boolean;
  status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'NOT_FOUND' | 'WRONG_EVENT' | 'NOT_CONFIRMED';
  message: string;
  ticketCode?: string;
  checkedInAt?: string;
  participant?: { id: number; fullName: string; avatarUrl?: string };
  eventTitle?: string;
  isPaid?: boolean;
  price?: number;
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
  recurrenceRule?: 'NONE' | 'WEEKLY' | 'CUSTOM';
  recurrenceIntervalDays?: number;
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

/** Сводка платформы для приветственной страницы (GET /public/stats, без входа). */
export interface PublicStats {
  upcomingEvents: number;
  athletes: number;
  sports: number;
  organizations: number;
}
