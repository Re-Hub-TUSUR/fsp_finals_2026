import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingTour } from './OnboardingTour';
import { AuthProvider } from '../context/AuthContext';

// Mock client api
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    defaults: { baseURL: 'http://localhost:8080/api/v1' },
  },
  errorMessage: (_e: any, fallback?: string) => fallback || 'Ошибка',
}));

vi.mock('../api', () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({ id: 1, email: 'user@sport.ru', fullName: 'Иван', role: 'ROLE_USER' }),
  },
  preferencesApi: {
    get: vi.fn().mockResolvedValue({ sports: [], preferredTimes: [] }),
    update: vi.fn().mockResolvedValue({ sports: [], preferredTimes: [] }),
  },
  catalogApi: {
    sports: vi.fn().mockResolvedValue([]),
  },
  citiesApi: {
    list: vi.fn().mockResolvedValue([]),
    nearest: vi.fn().mockResolvedValue({ id: 1, name: 'Красноярск' }),
  },
}));

describe('OnboardingTour', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  const renderWithRouter = (initialEntries = ['/?tour=1']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <div data-tour="nav-recommended">Рекомендации</div>
          <div data-tour="nav-map-feed">Карта и Лента</div>
          <div data-tour="filter-bar">Фильтры</div>
          <div data-tour="search-bar">Поиск</div>
          <div data-tour="create-event">Создать</div>
          <OnboardingTour />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders step 1 when ?tour=1 is provided', async () => {
    renderWithRouter(['/?tour=1']);

    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
    expect(screen.getByText('Шаг 1 из 5')).toBeInTheDocument();
    expect(screen.getByText('Пропустить обучение')).toBeInTheDocument();
    expect(screen.getByText('Далее')).toBeInTheDocument();
  });

  it('advances to next step on clicking "Далее"', async () => {
    renderWithRouter(['/?tour=1']);

    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();

    const nextBtn = screen.getByText('Далее');
    fireEvent.click(nextBtn);

    expect(await screen.findByText('Карта и Лента событий')).toBeInTheDocument();
    expect(screen.getByText('Шаг 2 из 5')).toBeInTheDocument();
  });

  it('advances to next step on clicking anywhere on the overlay backdrop', async () => {
    renderWithRouter(['/?tour=1']);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(dialog);

    expect(await screen.findByText('Карта и Лента событий')).toBeInTheDocument();
  });

  it('navigates back on clicking "Назад"', async () => {
    renderWithRouter(['/?tour=1']);

    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Далее'));

    expect(await screen.findByText('Карта и Лента событий')).toBeInTheDocument();

    const prevBtn = screen.getByText('Назад');
    fireEvent.click(prevBtn);

    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
  });

  it('closes tour and marks completed on clicking "Пропустить обучение"', async () => {
    renderWithRouter(['/?tour=1']);

    const skipBtn = await screen.findByText('Пропустить обучение');
    fireEvent.click(skipBtn);

    expect(screen.queryByText('Персональные рекомендации')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation: Enter advances step and Escape skips', async () => {
    renderWithRouter(['/?tour=1']);

    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByText('Карта и Лента событий')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Персональные рекомендации')).not.toBeInTheDocument();
  });

  it('shows final step with "Пройти тест прямо сейчас" button', async () => {
    renderWithRouter(['/?tour=1']);

    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();

    // 5 steps to reach final
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Далее'));
    }

    expect(await screen.findByText('Добро пожаловать в Sportikus!')).toBeInTheDocument();
    expect(screen.getByText('Пройти тест прямо сейчас')).toBeInTheDocument();
    expect(screen.getByText('Позже, перейти к событиям')).toBeInTheDocument();
  });
});
