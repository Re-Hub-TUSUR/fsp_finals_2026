import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SportEvent } from '../types';
import { MapEventCard } from './MapEventCard';
import { useAuth } from '../context/AuthContext';
import { eventsApi, participationApi } from '../api';
import { buildDemoEvent, tourDemo } from '../utils/tourDemo';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../api', () => ({
  eventsApi: { get: vi.fn() },
  participationApi: { join: vi.fn() },
}));

const asRole = (role: string | null) =>
  vi.mocked(useAuth).mockReturnValue({ currentUser: role ? { id: 1, role } : null } as unknown as ReturnType<typeof useAuth>);

function baseEvent(overrides: Partial<SportEvent> = {}): SportEvent {
  return {
    id: 7,
    title: 'Воскресный футбол',
    sport: { id: 1, name: 'Футбол', slug: 'football', custom: false },
    organizerName: 'Иван',
    byOrganization: false,
    startTime: '2026-10-20T12:00:00Z',
    endTime: '2026-10-20T14:00:00Z',
    lat: 56,
    lng: 92,
    address: 'ул. Ленина, 1',
    capacity: 10,
    confirmedCount: 5,
    joinMode: 'OPEN',
    skillLevel: 'ANY',
    status: 'PUBLISHED',
    ...overrides,
  };
}

function renderCard(event: SportEvent, props: Partial<Parameters<typeof MapEventCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <MapEventCard event={event} me={null} onClose={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('MapEventCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asRole('ROLE_USER');
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderCard(baseEvent(), { onClose });
    await user.click(screen.getByLabelText('Закрыть'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows "Записаться" for an open, unjoined, non-full event', () => {
    renderCard(baseEvent());
    expect(screen.getByText('Записаться')).toBeInTheDocument();
  });

  it('shows "Подать заявку" for an APPROVAL event', () => {
    renderCard(baseEvent({ joinMode: 'APPROVAL' }));
    expect(screen.getByText('Подать заявку')).toBeInTheDocument();
  });

  it('shows "Мест нет" once the event is full', () => {
    renderCard(baseEvent({ capacity: 3, confirmedCount: 3 }));
    expect(screen.getAllByText('Мест нет').length).toBeGreaterThan(0);
  });

  it('shows the confirmed state for the viewer\'s own participation', () => {
    renderCard(baseEvent({ myParticipation: { id: 1, status: 'CONFIRMED', createdAt: '' } }));
    expect(screen.getByText('Вы записаны ✓')).toBeInTheDocument();
  });

  it('shows a pending state for a PENDING participation', () => {
    renderCard(baseEvent({ myParticipation: { id: 1, status: 'PENDING', createdAt: '' } }));
    expect(screen.getByText('Заявка отправлена')).toBeInTheDocument();
  });

  it('calls onMore instead of navigating when provided', async () => {
    const user = userEvent.setup();
    const onMore = vi.fn();
    renderCard(baseEvent(), { onMore });
    await user.click(screen.getByText('Подробнее'));
    expect(onMore).toHaveBeenCalled();
  });

  it('links to a 2GIS route when onMore is not provided', () => {
    renderCard(baseEvent());
    expect(screen.getByText('Маршрут')).toHaveAttribute('href', expect.stringContaining('2gis.ru'));
  });

  it('"Записаться" starts joining and does not open the details panel', async () => {
    const user = userEvent.setup();
    const onMore = vi.fn();
    vi.mocked(eventsApi.get).mockResolvedValue(baseEvent());
    renderCard(baseEvent(), { onMore });
    await user.click(screen.getByRole('button', { name: 'Записаться' }));
    await waitFor(() => expect(eventsApi.get).toHaveBeenCalledWith(7));
    expect(onMore).not.toHaveBeenCalled();
  });

  it('an organization account gets a link to the event page instead of a join button', () => {
    asRole('ROLE_ORGANIZER');
    renderCard(baseEvent(), { onMore: vi.fn() });
    expect(screen.queryByRole('button', { name: 'Записаться' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть' })).toHaveAttribute('href', '/events/7');
  });

  it('учебная встреча тура: «Подать заявку» ведёт тур дальше и ничего не отправляет на сервер', async () => {
    const user = userEvent.setup();
    asRole('ROLE_ORGANIZER');
    const before = tourDemo.getState().joinClicked;
    renderCard(buildDemoEvent({ lat: 56, lng: 92 }), { onMore: vi.fn() });

    await user.click(screen.getByRole('button', { name: 'Подать заявку' }));

    expect(tourDemo.getState().joinClicked).toBe(before + 1);
    expect(eventsApi.get).not.toHaveBeenCalled();
    expect(participationApi.join).not.toHaveBeenCalled();
    // Ссылка на страницу учебной встречи не уводит со страницы: такой страницы нет
    expect(screen.getByText('Утренняя пробежка в парке').closest('[data-tour]')).toHaveAttribute('data-tour', 'demo-card');
  });
});
