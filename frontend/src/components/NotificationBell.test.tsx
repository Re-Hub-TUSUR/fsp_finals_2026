import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api';
import type { AppNotification } from '../types';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../api', () => ({
  notificationsApi: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));

const note = (over: Partial<AppNotification> = {}): AppNotification => ({
  id: 1,
  type: 'EVENT_INVITE',
  title: 'Вас пригласили',
  message: 'Друг зовёт на футбол',
  linkUrl: '/events/5',
  read: false,
  createdAt: new Date().toISOString(),
  ...over,
});

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ currentUser: { id: 1, role: 'ROLE_USER' } } as unknown as ReturnType<typeof useAuth>);
  });

  it('opens the panel on click even when there are no notifications', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue({ unreadCount: 0, items: [] });
    const user = userEvent.setup();
    renderBell();
    const bell = screen.getByRole('button', { name: 'Уведомления' });
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    await user.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Уведомлений нет')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Все уведомления' })).toHaveAttribute('href', '/notifications');
  });

  it('opens with the keyboard (Enter) and closes with Escape, returning focus to the bell', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue({ unreadCount: 1, items: [note()] });
    const user = userEvent.setup();
    renderBell();
    const bell = screen.getByRole('button', { name: 'Уведомления' });
    await user.tab();
    expect(bell).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Вас пригласили')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bell).toHaveFocus();
  });
});
