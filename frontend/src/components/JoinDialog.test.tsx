import { AxiosError } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SportEvent } from '../types';
import { JoinDialog } from './JoinDialog';
import { participationApi } from '../api';

vi.mock('../api', () => ({
  participationApi: { join: vi.fn() },
}));

function baseEvent(overrides: Partial<SportEvent> = {}): SportEvent {
  return {
    id: 1,
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
    joinMode: 'APPROVAL',
    skillLevel: 'ANY',
    status: 'PUBLISHED',
    ...overrides,
  };
}

describe('JoinDialog', () => {
  beforeEach(() => {
    vi.mocked(participationApi.join).mockReset();
  });

  it('submits straight away for an OPEN event with no questions', async () => {
    const user = userEvent.setup();
    vi.mocked(participationApi.join).mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(<JoinDialog event={baseEvent({ joinMode: 'OPEN' })} onClose={vi.fn()} onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: 'Подтвердить запись' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(participationApi.join).toHaveBeenCalledWith(1, {
      message: undefined,
      answers: {},
      acceptedRequirements: undefined,
    });
  });

  it('blocks submission when a required question is unanswered', async () => {
    const user = userEvent.setup();
    render(
      <JoinDialog
        event={baseEvent({
          registrationFields: [{ key: 'shirt', label: 'Размер футболки', type: 'TEXT', required: true }],
        })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ответьте на вопрос «Размер футболки»');
    expect(participationApi.join).not.toHaveBeenCalled();
  });

  it('submits once the required question is answered', async () => {
    const user = userEvent.setup();
    vi.mocked(participationApi.join).mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(
      <JoinDialog
        event={baseEvent({
          registrationFields: [{ key: 'shirt', label: 'Размер футболки', type: 'TEXT', required: true }],
        })}
        onClose={vi.fn()}
        onDone={onDone}
      />,
    );

    await user.type(screen.getByLabelText('Размер футболки', { exact: false }), 'M');
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('blocks submission when organizer requirements exist and are not accepted', async () => {
    const user = userEvent.setup();
    render(
      <JoinDialog
        event={baseEvent({ orgDetails: { medicalCertificateRequired: true } })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Подтвердите, что ознакомились с требованиями организатора');
    expect(participationApi.join).not.toHaveBeenCalled();
  });

  it('submits once requirements are accepted', async () => {
    const user = userEvent.setup();
    vi.mocked(participationApi.join).mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(
      <JoinDialog
        event={baseEvent({ orgDetails: { medicalCertificateRequired: true } })}
        onClose={vi.fn()}
        onDone={onDone}
      />,
    );

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(participationApi.join).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ acceptedRequirements: true }),
    );
  });

  it('shows the server error and re-enables the form when the API call fails', async () => {
    const user = userEvent.setup();
    const error = new AxiosError('Request failed');
    error.response = {
      data: { error: { message: 'Мест не осталось' } },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as never,
    };
    vi.mocked(participationApi.join).mockRejectedValue(error);
    render(<JoinDialog event={baseEvent({ joinMode: 'OPEN' })} onClose={vi.fn()} onDone={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Подтвердить запись' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Мест не осталось');
    expect(screen.getByRole('button', { name: 'Подтвердить запись' })).not.toBeDisabled();
  });

  it('closes when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<JoinDialog event={baseEvent()} onClose={onClose} onDone={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onClose).toHaveBeenCalled();
  });
});
