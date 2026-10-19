import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateEventPage } from './CreateEventPage';
import { useAuth } from '../context/AuthContext';
import { catalogApi, citiesApi } from '../api';
import type { EventTemplate, Sport, User } from '../types';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../api', () => ({
  catalogApi: { templates: vi.fn(), sports: vi.fn() },
  citiesApi: { nearest: vi.fn() },
  eventsApi: { create: vi.fn() },
}));
// Контейнер карты 2GIS грузит внешний SDK и недоступен в jsdom — выбор точки не относится к этому тесту.
vi.mock('../components/LocationPicker', () => ({
  LocationPicker: () => <div data-testid="location-picker-stub" />,
}));

const TEMPLATE: EventTemplate = {
  id: 1,
  code: 'FREE',
  name: 'Свободный формат',
  organizationOnly: false,
  defaultCapacity: 10,
  defaultJoinMode: 'APPROVAL',
  defaultSkillLevel: 'ANY',
  defaultDurationMinutes: 120,
  fields: [],
  registrationFields: [],
};

const SPORT: Sport = { id: 1, name: 'Футбол', slug: 'football', custom: false };

const USER: User = { id: 1, email: 'user@sport.ru', fullName: 'Иван', role: 'ROLE_USER' };

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    currentUser: USER,
    activeRoleKey: 'user',
    ready: true,
    authError: null,
    switchRole: vi.fn(),
    login: vi.fn(),
    acceptAuth: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    preferences: null,
    refreshPreferences: vi.fn(),
    ...overrides,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateEventPage />
    </MemoryRouter>,
  );
}

describe('CreateEventPage join-mode selector (regression: free-entry white screen bug)', () => {
  beforeEach(() => {
    mockAuth();
    vi.mocked(catalogApi.templates).mockResolvedValue([TEMPLATE]);
    vi.mocked(catalogApi.sports).mockResolvedValue([SPORT]);
    vi.mocked(citiesApi.nearest).mockResolvedValue(null as never);
  });

  it('renders both join-mode options once templates load', async () => {
    renderPage();
    expect(await screen.findByText('Свободный вход')).toBeInTheDocument();
    expect(screen.getByText('С подтверждением организатора')).toBeInTheDocument();
  });

  it('switches to OPEN ("free entry") without throwing or blanking the form', async () => {
    const user = userEvent.setup();
    renderPage();

    const openOption = await screen.findByText('Свободный вход');
    await user.click(openOption);

    // Этот клик именно так уводил страницу в белый экран (sr-only radio без position:relative
    // на обёртке сбивал скролл всего документа). Если форма всё ещё на месте — регрессии нет.
    expect(screen.getByText('Создать мероприятие')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /свободный вход/i })).toBeChecked();
  });

  it('switching join mode back and forth keeps exactly one radio checked', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Свободный вход');
    const open = screen.getByRole('radio', { name: /свободный вход/i });
    const approval = screen.getByRole('radio', { name: /с подтверждением организатора/i });

    expect(approval).toBeChecked();
    await user.click(open);
    expect(open).toBeChecked();
    expect(approval).not.toBeChecked();
    await user.click(approval);
    expect(approval).toBeChecked();
    expect(open).not.toBeChecked();
  });

  it('wraps each join-mode radio in a positioned label (the actual fix for the white-screen bug)', async () => {
    renderPage();
    const open = await screen.findByRole('radio', { name: /свободный вход/i });
    const label = open.closest('label');
    expect(label).not.toBeNull();
    expect(label).toHaveClass('relative');
  });
});
