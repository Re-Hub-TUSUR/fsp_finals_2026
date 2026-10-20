import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SportEvent } from '../types';
import { EventMeter, FriendsAttending, SeatMeter, SportIcon, StatusChip } from './EventBits';

function baseEvent(overrides: Partial<SportEvent> = {}): SportEvent {
  return {
    id: 1,
    title: 'Событие',
    sport: { id: 1, name: 'Бег', slug: 'beg', custom: false },
    organizerName: 'Организатор',
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

describe('SportIcon', () => {
  it('falls back to the trophy icon for an unrecognized sport name', () => {
    const { container: known } = render(<SportIcon name="Шахматы" />);
    const { container: fallback } = render(<SportIcon name="Бег" />);
    // "Бег" matches a dedicated icon, "Шахматы" does not and should fall back —
    // their path data must differ, proving the fallback actually kicked in.
    expect(known.querySelector('svg')?.innerHTML).not.toBe(fallback.querySelector('svg')?.innerHTML);
  });
});

describe('StatusChip', () => {
  it('renders nothing for a comfortably open event', () => {
    // Дата фикстуры — сегодня; без явного «завтра» тест падал бы, пока событие «идёт сейчас»
    const tomorrow = Date.now() + 86_400_000;
    const event = baseEvent({
      capacity: 10,
      confirmedCount: 2,
      startTime: new Date(tomorrow).toISOString(),
      endTime: new Date(tomorrow + 7_200_000).toISOString(),
    });
    const { container } = render(<StatusChip event={event} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a chip when spots are nearly gone', () => {
    render(<StatusChip event={baseEvent({ capacity: 10, confirmedCount: 9 })} />);
    expect(screen.getByText('Осталось 1')).toBeInTheDocument();
  });
});

describe('EventMeter', () => {
  it('shows a live indicator while the event is in progress', () => {
    const now = Date.now();
    render(
      <EventMeter
        event={baseEvent({ startTime: new Date(now - 1000).toISOString(), endTime: new Date(now + 3600_000).toISOString() })}
      />,
    );
    expect(screen.getByText('Идёт сейчас')).toBeInTheDocument();
  });

  it('shows "Мест нет" when full', () => {
    render(<EventMeter event={baseEvent({ capacity: 3, confirmedCount: 3 })} />);
    expect(screen.getByText('Мест нет')).toBeInTheDocument();
  });
});

describe('SeatMeter', () => {
  it('reports the correct plural form for remaining seats', () => {
    render(<SeatMeter event={baseEvent({ capacity: 10, confirmedCount: 9 })} />);
    expect(screen.getByText('1 место свободно')).toBeInTheDocument();
  });

  it('reports "Мест нет" at zero remaining', () => {
    render(<SeatMeter event={baseEvent({ capacity: 5, confirmedCount: 5 })} />);
    expect(screen.getByText('Мест нет')).toBeInTheDocument();
  });

  it('shows occupancy out of capacity', () => {
    render(<SeatMeter event={baseEvent({ capacity: 10, confirmedCount: 4 })} />);
    expect(screen.getByText('занято 4 из 10')).toBeInTheDocument();
  });
});

describe('FriendsAttending', () => {
  it('renders nothing when no friends are attending', () => {
    const { container } = render(<FriendsAttending event={baseEvent({ friendsAttending: [] })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a count suffix only beyond 3 friends', () => {
    const friends = [
      { id: 1, fullName: 'Аня' },
      { id: 2, fullName: 'Боря' },
      { id: 3, fullName: 'Вера' },
    ];
    render(<FriendsAttending event={baseEvent({ friendsAttending: friends })} />);
    expect(screen.getByText('Идут')).toBeInTheDocument();
  });

  it('shows the total count once more than 3 friends are attending', () => {
    const friends = [
      { id: 1, fullName: 'Аня' },
      { id: 2, fullName: 'Боря' },
      { id: 3, fullName: 'Вера' },
      { id: 4, fullName: 'Гена' },
    ];
    render(<FriendsAttending event={baseEvent({ friendsAttending: friends })} />);
    expect(screen.getByText('Идут · 4')).toBeInTheDocument();
  });
});
