import { api } from './client';
import type {
  AdminOrganization,
  CreateEventPayload,
  EventTemplate,
  JoinMode,
  JoinPayload,
  Participation,
  SkillLevel,
  Sport,
  SportEvent,
  User,
} from '../types';

export interface EventQuery {
  sport?: string[];
  q?: string;
  skillLevel?: SkillLevel;
  joinMode?: JoinMode;
  template?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
};

export const catalogApi = {
  sports: () => api.get<Sport[]>('/sports').then((r) => r.data),
  templates: () => api.get<EventTemplate[]>('/templates').then((r) => r.data),
};

export const eventsApi = {
  list: (query: EventQuery = {}) =>
    api
      .get<SportEvent[]>('/events', {
        params: { ...query, sport: query.sport?.length ? query.sport.join(',') : undefined },
      })
      .then((r) => r.data),
  get: (id: number | string) => api.get<SportEvent>(`/events/${id}`).then((r) => r.data),
  create: (payload: CreateEventPayload) => api.post<SportEvent>('/events', payload).then((r) => r.data),
  icsUrl: (id: number) => `${api.defaults.baseURL}/events/${id}/ics`,
};

export const participationApi = {
  join: (eventId: number, payload: JoinPayload) =>
    api.post<Participation>(`/events/${eventId}/join`, payload).then((r) => r.data),
  cancel: (eventId: number) => api.delete<Participation>(`/events/${eventId}/join`).then((r) => r.data),
  forEvent: (eventId: number | string) =>
    api.get<Participation[]>(`/events/${eventId}/participations`).then((r) => r.data),
  decide: (eventId: number, participationId: number, decision: 'CONFIRMED' | 'REJECTED', comment?: string) =>
    api
      .patch<Participation>(`/events/${eventId}/participations/${participationId}`, { decision, comment })
      .then((r) => r.data),
};

export const meApi = {
  participations: () => api.get<Participation[]>('/me/participations').then((r) => r.data),
  events: () => api.get<SportEvent[]>('/me/events').then((r) => r.data),
};

export const adminApi = {
  organizations: () => api.get<AdminOrganization[]>('/admin/organizations').then((r) => r.data),
  approveOrg: (id: number) => api.post<AdminOrganization>(`/admin/organizations/${id}/approve`).then((r) => r.data),
  rejectOrg: (id: number, reason: string) =>
    api.post<AdminOrganization>(`/admin/organizations/${id}/reject`, { reason }).then((r) => r.data),
  events: () => api.get<SportEvent[]>('/admin/events').then((r) => r.data),
  unpublish: (id: number, reason: string) =>
    api.post<SportEvent>(`/admin/events/${id}/unpublish`, { reason }).then((r) => r.data),
  publish: (id: number) => api.post<SportEvent>(`/admin/events/${id}/publish`).then((r) => r.data),
};
