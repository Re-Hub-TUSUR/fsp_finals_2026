import { AxiosError } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InviteFriend, SportEvent } from '../types';
import { eventsApi } from '../api';
import { InviteFriendsModal } from './InviteFriendsModal';

vi.mock('../api', () => ({
  eventsApi: { inviteCandidates: vi.fn(), inviteFriends: vi.fn() },
}));

const EVENT = {
  id: 8,
  title: 'Велопрогулка',
  sport: { id: 1, name: 'Велоспорт', slug: 'velosport', custom: false },
  organizerName: 'Дмитрий',
  byOrganization: false,
  startTime: '2026-10-25T10:00:00Z',
  endTime: '2026-10-25T12:00:00Z',
  lat: 56,
  lng: 92,
  address: 'Набережная',
  capacity: 10,
  confirmedCount: 2,
  joinMode: 'OPEN',
  skillLevel: 'ANY',
  status: 'PUBLISHED',
} as SportEvent;

const FRIENDS: InviteFriend[] = [
  { userId: 3, fullName: 'Алексей Профи', state: 'PARTICIPATING' },
  { userId: 8, fullName: 'Дмитрий Бегунов', state: 'AVAILABLE' },
  { userId: 2, fullName: 'Ольга Новичкова', state: 'INVITED' },
  { userId: 9, fullName: 'Пётр Лыжник', state: 'AVAILABLE' },
];

function renderModal(onInvited = vi.fn(), onClose = vi.fn()) {
  render(<InviteFriendsModal event={EVENT} open onClose={onClose} onInvited={onInvited} />);
  return { onInvited, onClose };
}

describe('InviteFriendsModal', () => {
  beforeEach(() => {
    vi.mocked(eventsApi.inviteCandidates).mockReset().mockResolvedValue(FRIENDS);
    vi.mocked(eventsApi.inviteFriends).mockReset();
  });

  it('берёт друзей с состояниями для этого мероприятия', async () => {
    renderModal();
    await screen.findByText('Дмитрий Бегунов');
    expect(eventsApi.inviteCandidates).toHaveBeenCalledWith(8);
  });

  it('уже приглашённых и уже идущих выбрать нельзя — у них метка', async () => {
    renderModal();
    const olga = await screen.findByRole('button', { name: /Ольга Новичкова/ });
    const alexey = screen.getByRole('button', { name: /Алексей Профи/ });

    expect(olga).toBeDisabled();
    expect(olga).toHaveTextContent('Уже приглашён');
    expect(alexey).toBeDisabled();
    expect(alexey).toHaveTextContent('Уже идёт');
    expect(screen.getByRole('button', { name: /Дмитрий Бегунов/ })).toBeEnabled();
  });

  it('отправляет выбранных с сообщением и показывает итог', async () => {
    const user = userEvent.setup();
    vi.mocked(eventsApi.inviteFriends).mockResolvedValue({
      invitedCount: 2,
      invitedUserIds: [8, 9],
      alreadyInvitedIds: [],
      alreadyParticipatingIds: [],
    });
    const { onInvited } = renderModal();

    expect(await screen.findByRole('button', { name: /^Пригласить/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Дмитрий Бегунов/ }));
    await user.click(screen.getByRole('button', { name: /Пётр Лыжник/ }));
    expect(screen.getByRole('button', { name: /Дмитрий Бегунов/ })).toHaveAttribute('aria-pressed', 'true');
    await user.type(screen.getByLabelText(/Сообщение к приглашению/), 'Поехали вместе?');
    await user.click(screen.getByRole('button', { name: 'Пригласить (2)' }));

    expect(eventsApi.inviteFriends).toHaveBeenCalledWith(8, { friendIds: [8, 9], message: 'Поехали вместе?' });
    expect(await screen.findByText('Приглашения отправлены')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 друга получат уведомление');
    expect(onInvited).toHaveBeenCalledWith(2);
  });

  it('сообщает, кого сервер пропустил', async () => {
    const user = userEvent.setup();
    vi.mocked(eventsApi.inviteFriends).mockResolvedValue({
      invitedCount: 0,
      invitedUserIds: [],
      alreadyInvitedIds: [8],
      alreadyParticipatingIds: [],
    });
    renderModal();

    await user.click(await screen.findByRole('button', { name: /Дмитрий Бегунов/ }));
    await user.click(screen.getByRole('button', { name: 'Пригласить (1)' }));

    expect(await screen.findByText('Никого нового не позвали')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Уже приглашены раньше: 1');
  });

  it('если звать некого — нет кнопки отправки и есть пояснение', async () => {
    vi.mocked(eventsApi.inviteCandidates).mockResolvedValue(FRIENDS.filter((f) => f.state !== 'AVAILABLE'));
    renderModal();

    expect(await screen.findByText('Все ваши друзья уже приглашены или идут на это мероприятие.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Пригласить/ })).not.toBeInTheDocument();
  });

  it('без друзей подсказывает, где их найти', async () => {
    vi.mocked(eventsApi.inviteCandidates).mockResolvedValue([]);
    renderModal();
    expect(await screen.findByText('У вас пока нет друзей в Sportikus')).toBeInTheDocument();
  });

  it('ошибку сервера показывает и даёт попробовать снова', async () => {
    const user = userEvent.setup();
    const error = new AxiosError('fail');
    error.response = {
      data: { error: { message: 'Приём заявок на мероприятие закрыт — звать друзей уже поздно' } },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as never,
    };
    vi.mocked(eventsApi.inviteFriends).mockRejectedValue(error);
    renderModal();

    await user.click(await screen.findByRole('button', { name: /Дмитрий Бегунов/ }));
    await user.click(screen.getByRole('button', { name: 'Пригласить (1)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('звать друзей уже поздно');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Пригласить (1)' })).toBeEnabled());
  });
});
