import { api } from './client';
import type {
  AdminOrganization,
  City,
  Preferences,
  Recommendations,
  UpdatePreferencesPayload,
  CreateEventPayload,
  EventTemplate,
  JoinMode,
  JoinPayload,
  Participation,
  SkillLevel,
  Sport,
  SportEvent,
  User,
  Profile,
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
  registerUser: (payload: { email: string; firstName: string; lastName: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/register/user', payload).then((r) => r.data),
  registerOrganization: (payload: { name: string; inn: string; ogrn: string; kpp: string; email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/register/organization', payload).then((r) => r.data),
};

export const profilesApi = {
  user: (id: number | string) => api.get<Profile>(`/profiles/users/${id}`).then((r) => r.data),
  organization: (id: number | string) => api.get<Profile>(`/profiles/organizations/${id}`).then((r) => r.data),
  updateUser: (id: number, payload: { name: string; description?: string; imageUrl?: string }) =>
    api.patch<Profile>(`/profiles/users/${id}`, payload).then((r) => r.data),
  updateOrganization: (id: number, payload: { name: string; description?: string; imageUrl?: string }) =>
    api.patch<Profile>(`/profiles/organizations/${id}`, payload).then((r) => r.data),
  uploadUserImage: (id: number, file: File) => {
    const body = new FormData(); body.append('file', file);
    return api.post<Profile>(`/profiles/users/${id}/image`, body).then((r) => r.data);
  },
  uploadOrganizationImage: (id: number, file: File) => {
    const body = new FormData(); body.append('file', file);
    return api.post<Profile>(`/profiles/organizations/${id}/image`, body).then((r) => r.data);
  },
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

export const citiesApi = {
  list: () => api.get<City[]>('/cities').then((r) => r.data),
  nearest: (lat: number, lng: number) => api.get<City>('/cities/nearest', { params: { lat, lng } }).then((r) => r.data),
};

/** Интересы пользователя. update() вызывается и из формы регистрации, и из профиля. */
export const preferencesApi = {
  get: () => api.get<Preferences>('/me/preferences').then((r) => r.data),
  update: (payload: UpdatePreferencesPayload) => api.put<Preferences>('/me/preferences', payload).then((r) => r.data),
};

export const recommendationsApi = {
  get: (params: { lat?: number; lng?: number; limit?: number } = {}) =>
    api.get<Recommendations>('/recommendations', { params }).then((r) => r.data),
  feedback: (eventId: number, action: 'CLICK' | 'DISMISS', requestId?: string, position?: number) =>
    api.post('/recommendations/feedback', { eventId, action, requestId, position }),
  undoDismiss: (eventId: number) => api.delete(`/recommendations/feedback/${eventId}`),
};
