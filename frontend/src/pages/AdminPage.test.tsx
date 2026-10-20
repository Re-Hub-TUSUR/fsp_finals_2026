import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';
import { useAuth } from '../context/AuthContext';
import { adminApi, commentsApi } from '../api';
import type { AdminOrganization, EventComment, SportEvent, User } from '../types';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../api', () => ({
  adminApi: { organizations: vi.fn(), events: vi.fn() },
  commentsApi: { adminList: vi.fn(), hide: vi.fn() },
}));

const ADMIN: User = { id: 9, email: 'admin@sport.ru', fullName: 'Админ', role: 'ROLE_ADMIN' };

const ORGS: AdminOrganization[] = [
  { id: 1, name: 'СК «Енисей»', description: 'Спортивный клуб', status: 'APPROVED', ownerName: 'Пётр Енисеев', ownerEmail: 'enisey@sport.ru' },
  { id: 2, name: 'Клуб «Ладья»', description: 'Шахматы', status: 'PENDING', ownerName: 'Анна Ладьина', ownerEmail: 'ladya@sport.ru' },
];

const event = (over: Partial<SportEvent>): SportEvent => ({
  id: 1, title: 'Дворовый футбол', sport: { id: 1, name: 'Футбол', slug: 'football', custom: false },
  organizerName: 'Иван Иванов', byOrganization: false, organizerUserId: 5,
  startTime: '2026-11-01T10:00:00Z', endTime: '2026-11-01T12:00:00Z', lat: 56, lng: 92, address: 'ул. Мира, 1',
  cityName: 'Красноярск', timeZone: 'Asia/Krasnoyarsk', capacity: 10, confirmedCount: 1, joinMode: 'OPEN', skillLevel: 'ANY', status: 'PUBLISHED',
  ...over,
});

const EVENTS: SportEvent[] = [
  event({ id: 1 }),
  event({ id: 2, title: 'Турнир по волейболу', sport: { id: 2, name: 'Волейбол', slug: 'volleyball', custom: false }, organizerName: 'СК «Енисей»', byOrganization: true, organizationId: 1, organizerUserId: undefined, cityName: 'Москва' }),
];

const COMMENTS: EventComment[] = [
  { id: 1, eventId: 1, eventTitle: 'Дворовый футбол', authorId: 3, authorName: 'Ольга', authorRole: 'ROLE_USER', text: 'Нужны ли бутсы?', organizer: false, hidden: false, createdAt: '2026-10-20T10:00:00Z' },
  { id: 2, eventId: 2, eventTitle: 'Турнир по волейболу', authorId: 4, authorName: 'Алексей', authorRole: 'ROLE_USER', text: 'Во сколько сбор?', organizer: false, hidden: false, createdAt: '2026-10-20T11:00:00Z' },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );
}

describe('AdminPage: поиск и переходы', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ currentUser: ADMIN, ready: true } as ReturnType<typeof useAuth>);
    vi.mocked(adminApi.organizations).mockResolvedValue(ORGS);
    vi.mocked(adminApi.events).mockResolvedValue(EVENTS);
    vi.mocked(commentsApi.adminList).mockResolvedValue(COMMENTS);
  });

  it('ищет организации по названию, владельцу и e-mail', async () => {
    renderPage();
    const search = await screen.findByRole('searchbox');
    await userEvent.type(search, 'ладья');
    expect(screen.getByText('Клуб «Ладья»')).toBeInTheDocument();
    expect(screen.queryByText('СК «Енисей»')).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'enisey@');
    expect(screen.getByText('СК «Енисей»')).toBeInTheDocument();
    expect(screen.queryByText('Клуб «Ладья»')).not.toBeInTheDocument();
  });

  it('название организации ведёт на её страницу с мероприятиями', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: 'Клуб «Ладья»' });
    expect(link).toHaveAttribute('href', '/profiles/organizations/2');
  });

  it('ищет мероприятия по названию, виду спорта и городу и ведёт к организатору', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('tab', { name: /Мероприятия/ }));
    const search = screen.getByRole('searchbox');

    await userEvent.type(search, 'москва');
    expect(screen.getByText('Турнир по волейболу')).toBeInTheDocument();
    expect(screen.queryByText('Дворовый футбол')).not.toBeInTheDocument();
    expect(within(screen.getByText('Турнир по волейболу').closest('div')!).getByRole('link', { name: 'СК «Енисей»' }))
      .toHaveAttribute('href', '/profiles/organizations/1');

    await userEvent.clear(search);
    await userEvent.type(search, 'футбол');
    expect(screen.getByRole('link', { name: 'Иван Иванов' })).toHaveAttribute('href', '/profiles/users/5');
  });

  it('при отсутствии совпадений сообщает «Ничего не найдено», а смена вкладки сбрасывает запрос', async () => {
    renderPage();
    await userEvent.type(await screen.findByRole('searchbox'), 'zzz');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Комментарии/ }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByText('Нужны ли бутсы?')).toBeInTheDocument();
    expect(screen.getByText('Во сколько сбор?')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('searchbox'), 'бутсы');
    expect(screen.queryByText('Во сколько сбор?')).not.toBeInTheDocument();
  });
});
