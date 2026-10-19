import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ParticipationStatus } from '../types';
import { ParticipationBadge } from './ParticipationBadge';

describe('ParticipationBadge', () => {
  const cases: [ParticipationStatus, string][] = [
    ['PENDING', 'Ждёт подтверждения'],
    ['CONFIRMED', 'Участие подтверждено'],
    ['REJECTED', 'Заявка отклонена'],
    ['CANCELLED', 'Запись отменена'],
    ['WAITLISTED', 'В очереди'],
  ];

  it.each(cases)('renders the Russian label for %s', (status, label) => {
    render(<ParticipationBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
