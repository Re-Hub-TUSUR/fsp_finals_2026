import { useSyncExternalStore } from 'react';
import type { SportEvent } from '../types';
import type { LatLng } from './eventView';

/**
 * Демо-событие обучающего тура. Пока идёт часть тура про запись, на карте главной появляется метка
 * вымышленного мероприятия: его можно открыть и нажать «Подать заявку», как настоящее.
 * Событие живёт только в памяти браузера: на сервер оно не попадает, а после тура исчезает.
 *
 * Связь тура и главной — через этот модуль, а не через пропсы: тур рисуется в каркасе приложения,
 * а карта — внутри страницы.
 */

/** Отрицательный id не пересекается с настоящими мероприятиями из БД. */
export const DEMO_EVENT_ID = -1;

export const isDemoEvent = (event: Pick<SportEvent, 'id'> | null | undefined) => event?.id === DEMO_EVENT_ID;

interface TourDemoState {
  /** Метка демо-события показывается на карте. */
  active: boolean;
  /** Номер запроса «откройте карточку»: каждое увеличение — новый запрос от тура. */
  openRequest: number;
  /** Карточка демо-события открыта на карте (кликом по метке, строке списка или по запросу тура). */
  opened: number;
  /** Пользователь нажал «Подать заявку» (или «Подробнее») в карточке демо-события. */
  joinClicked: number;
}

let state: TourDemoState = { active: false, openRequest: 0, opened: 0, joinClicked: 0 };
const listeners = new Set<() => void>();

function update(patch: Partial<TourDemoState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const tourDemo = {
  activate: () => {
    if (!state.active) update({ active: true });
  },
  deactivate: () => {
    if (state.active) update({ active: false });
  },
  requestOpen: () => update({ openRequest: state.openRequest + 1 }),
  reportOpened: () => update({ opened: state.opened + 1 }),
  reportJoinClicked: () => update({ joinClicked: state.joinClicked + 1 }),
  getState: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useTourDemo(): TourDemoState {
  return useSyncExternalStore(tourDemo.subscribe, tourDemo.getState, tourDemo.getState);
}

/** Ближайшая суббота, 08:00 по часам устройства (если сегодня суббота и утро прошло — следующая). */
function nextSaturdayMorning(now = new Date()): Date {
  const date = new Date(now);
  date.setHours(8, 0, 0, 0);
  const days = (6 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + days);
  if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + 7);
  return date;
}

/** Вымышленное мероприятие для тура в точке, которую сейчас видно на карте. */
export function buildDemoEvent(at: LatLng): SportEvent {
  const start = nextSaturdayMorning();
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  return {
    id: DEMO_EVENT_ID,
    title: 'Утренняя пробежка в парке',
    description: 'Пример мероприятия из обучения: лёгкий темп, 5 км, подходит новичкам.',
    sport: { id: DEMO_EVENT_ID, name: 'Бег', slug: 'beg', custom: false },
    organizerName: 'Беговой клуб «Рассвет»',
    byOrganization: false,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    lat: at.lat,
    lng: at.lng,
    address: 'Центральный парк, у главного входа',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    capacity: 12,
    confirmedCount: 7,
    joinMode: 'APPROVAL',
    skillLevel: 'NOVICE',
    price: 0,
    requiredEquipment: 'кроссовки, вода',
    status: 'PUBLISHED',
    friendsAttending: [{ id: DEMO_EVENT_ID, fullName: 'Ольга' }],
  };
}
