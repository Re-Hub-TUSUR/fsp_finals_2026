import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { SportEvent, User } from '../../types';
import { ParticipationPanel, type ParticipationActions } from './ParticipationPanel';
import { eventPhase } from './eventPhase';

const NOW = Date.parse('2030-01-01T10:00:00Z');

function baseEvent(overrides: Partial<SportEvent> = {}): SportEvent {
  return {
    id: 7,
    title: 'Воскресный футбол',
    sport: { id: 1, name: 'Футбол', slug: 'football', custom: false },
    organizerName: 'Иван',
    byOrganization: false,
    startTime: '2030-01-02T12:00:00Z',
    endTime: '2030-01-02T14:00:00Z',
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

function renderPanel(event: SportEvent, role: User['role'] | undefined = 'ROLE_USER') {
  const actions: ParticipationActions = {
    join: vi.fn(),
    cancel: vi.fn(),
    claimSpot: vi.fn(),
    showTicket: vi.fn(),
    openScanner: vi.fn(),
    complete: vi.fn(),
  };
  render(
    <MemoryRouter>
      <ParticipationPanel event={event} phase={eventPhase(event, NOW)} role={role} busy={false} actions={actions} />
    </MemoryRouter>,
  );
  return actions;
}

describe('eventPhase', () => {
  it('closes registration at the deadline even before the start', () => {
    const phase = eventPhase(baseEvent({ registrationDeadline: '2029-12-31T00:00:00Z' }), NOW);
    expect(phase.closed).toBe(true);
    expect(phase.ended).toBe(false);
  });

  it('treats moderation as unpublished but archive as its own state', () => {
    expect(eventPhase(baseEvent({ status: 'MODERATION' }), NOW)).toMatchObject({ unpublished: true, onReview: true });
    expect(eventPhase(baseEvent({ status: 'ARCHIVED' }), NOW)).toMatchObject({ unpublished: false, archived: true });
  });
});

describe('ParticipationPanel', () => {
  it('offers to join an open event', async () => {
    const actions = renderPanel(baseEvent());
    await userEvent.click(screen.getByRole('button', { name: 'Записаться' }));
    expect(actions.join).toHaveBeenCalled();
    expect(screen.getByText('Вход свободный — запись подтверждается сразу')).toBeInTheDocument();
  });

  it('offers the waitlist when the event is full', () => {
    renderPanel(baseEvent({ confirmedCount: 10, waitlistCount: 3 }));
    expect(screen.getByRole('button', { name: 'Встать в очередь' })).toBeInTheDocument();
    expect(screen.getByText('Сейчас в очереди: 3')).toBeInTheDocument();
  });

  it('shows the ticket and cancel actions to a confirmed participant', async () => {
    const actions = renderPanel(
      baseEvent({ myParticipation: { id: 1, status: 'CONFIRMED', createdAt: '', ticketCode: 'ABC123' } }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Показать QR-билет/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Отменить участие' }));
    expect(actions.showTicket).toHaveBeenCalled();
    expect(actions.cancel).toHaveBeenCalled();
  });

  it('lets a waitlisted user claim a freed spot', async () => {
    const actions = renderPanel(baseEvent({ myParticipation: { id: 1, status: 'WAITLISTED', createdAt: '' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Занять место' }));
    expect(actions.claimSpot).toHaveBeenCalled();
  });

  it('gives the organizer management tools instead of joining', () => {
    renderPanel(baseEvent({ canManage: true, pendingCount: 2, joinMode: 'APPROVAL' }), 'ROLE_ORGANIZER');
    expect(screen.getByRole('link', { name: /Заявки и участники/ })).toHaveAttribute('href', '/events/7/manage');
    expect(screen.queryByRole('button', { name: 'Записаться' })).not.toBeInTheDocument();
  });

  it('does not let an administrator join', () => {
    renderPanel(baseEvent(), 'ROLE_ADMIN');
    expect(screen.getByText(/Администратор не участвует/)).toBeInTheDocument();
  });
});
