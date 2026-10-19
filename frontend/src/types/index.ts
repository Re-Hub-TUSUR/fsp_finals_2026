export type Role = 'ROLE_USER' | 'ROLE_ORGANIZER' | 'ROLE_ADMIN';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
  organizationId?: number;
  orgStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Sport {
  id: number;
  name: string;
  slug: string;
  isCustom: boolean;
}

export type JoinMode = 'OPEN' | 'APPROVAL';
export type SkillLevel = 'NOVICE' | 'AMATEUR' | 'PRO' | 'ANY';
export type EventStatus = 'PUBLISHED' | 'UNPUBLISHED' | 'CANCELLED';

export interface SportEvent {
  id: number;
  title: string;
  description: string;
  sport: Sport;
  organizerName: string;
  organizerAvatar?: string;
  isOrganization: boolean;
  startTime: string;
  endTime: string;
  lat: number;
  lng: number;
  address: string;
  capacity: number;
  confirmedCount: number;
  joinMode: JoinMode;
  skillLevel: SkillLevel;
  requiredEquipment?: string;
  status: EventStatus;
  unpublishReason?: string;
}

export interface Organization {
  id: number;
  name: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
  logoUrl?: string;
}
