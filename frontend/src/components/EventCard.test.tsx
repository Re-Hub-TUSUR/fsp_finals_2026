import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { SportEvent } from '../types';
import { EventCard } from './EventCard';

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

function renderCard(event: SportEvent) {
  return render(
    <MemoryRouter>
      <EventCard event={event} />
    </MemoryRouter>,
  );
}

describe('EventCard', () => {
  it('links the title to the event page', () => {
    renderCard(baseEvent());
    expect(screen.getByRole('link', { name: 'Воскресный футбол' })).toHaveAttribute('href', '/events/7');
  });

  it('shows "Подробнее" when the viewer has not joined', () => {
    renderCard(baseEvent());
    expect(screen.getByText('Подробнее')).toBeInTheDocument();
  });

  it('shows the participation badge instead of "Подробнее" once joined', () => {
    renderCard(baseEvent({ myParticipation: { id: 1, status: 'CONFIRMED', createdAt: '' } }));
    expect(screen.getByText('Участие подтверждено')).toBeInTheDocument();
    expect(screen.queryByText('Подробнее')).not.toBeInTheDocument();
  });

  it('falls back to "Подробнее" when the participation was cancelled', () => {
    renderCard(baseEvent({ myParticipation: { id: 1, status: 'CANCELLED', createdAt: '' } }));
    expect(screen.getByText('Подробнее')).toBeInTheDocument();
  });

  it('shows the free price label when there is no price', () => {
    renderCard(baseEvent({ price: undefined }));
    expect(screen.getByText('Бесплатно')).toBeInTheDocument();
  });
});
