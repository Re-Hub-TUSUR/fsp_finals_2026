import { useEffect, useState } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingTour } from './OnboardingTour';
import { AuthProvider } from '../context/AuthContext';
import { tourDemo, useTourDemo } from '../utils/tourDemo';

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

/** Заменяет главную: пока тур включил учебную встречу, показывает её метку и карточку, как карта. */
function DemoMapStub() {
  const demo = useTourDemo();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (demo.openRequest > 0) setOpen(true);
  }, [demo.openRequest]);
  useEffect(() => {
    if (!demo.active) setOpen(false);
  }, [demo.active]);
  if (!demo.active) return null;
  return (
    <>
      <button type="button" data-tour="demo-pin" onClick={() => { setOpen(true); tourDemo.reportOpened(); }}>
        Метка учебной встречи
      </button>
      {open && (
        <div data-tour="demo-card">
          <button type="button" onClick={() => tourDemo.reportJoinClicked()}>Подать заявку</button>
        </div>
      )}
    </>
  );
}

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
          <DemoMapStub />
          <OnboardingTour />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders step 1 when ?tour=1 is provided', async () => {
    renderWithRouter(['/?tour=1']);

    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
    expect(screen.getByText('Шаг 1 из 9')).toBeInTheDocument();
    expect(screen.getByText('Пропустить обучение')).toBeInTheDocument();
    expect(screen.getByText('Далее')).toBeInTheDocument();
  });

  it('advances to next step on clicking "Далее"', async () => {
    renderWithRouter(['/?tour=1']);

    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();

    const nextBtn = screen.getByText('Далее');
    fireEvent.click(nextBtn);

    expect(await screen.findByText('Карта и Лента событий')).toBeInTheDocument();
    expect(screen.getByText('Шаг 2 из 9')).toBeInTheDocument();
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

    // 5 шагов по интерфейсу и 4 шага учебной записи до финала
    for (let i = 0; i < 9; i++) {
      fireEvent.click(screen.getByText('Далее'));
    }

    expect(await screen.findByText('Добро пожаловать в Sportikus!')).toBeInTheDocument();
    expect(screen.getByText('Пройти тест прямо сейчас')).toBeInTheDocument();
    expect(screen.getByText('Позже, перейти к событиям')).toBeInTheDocument();
  });

  it('после шага 5 ведёт по учебной записи: метка на карте → карточка → заявка → билет, затем убирает встречу', async () => {
    renderWithRouter(['/?tour=1']);
    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
    expect(screen.queryByText('Метка учебной встречи')).not.toBeInTheDocument();
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('Далее'));

    expect(await screen.findByText('Найдите встречу на карте')).toBeInTheDocument();
    expect(screen.getByText('Шаг 6 из 9')).toBeInTheDocument();
    // Пользователь сам нажимает на метку — тур идёт за ним
    fireEvent.click(await screen.findByText('Метка учебной встречи'));
    expect(await screen.findByText('Карточка встречи')).toBeInTheDocument();

    // «Подать заявку» в карточке ведёт к заявке; на сервер ничего не уходит
    fireEvent.click(screen.getByText('Подать заявку'));
    expect(await screen.findByText('Как записаться: заявка')).toBeInTheDocument();
    const stand = screen.getByRole('group', { name: /Демонстрационный пример/ });
    expect(stand).toHaveTextContent('Отправить заявку');
    expect(stand.querySelector('button')).toBeNull();
    expect(await screen.findByText('Бегу впервые в компании — подскажете темп?', {}, { timeout: 4000 })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Далее'));
    expect(await screen.findByText('Как записаться: QR-билет')).toBeInTheDocument();
    expect(screen.getByText('SPT-DEMO2026')).toBeInTheDocument();
    expect(await screen.findByAltText('Пример QR-кода билета SPT-DEMO2026')).toBeInTheDocument();
    expect(screen.getByText('Метка учебной встречи')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Далее'));
    expect(await screen.findByText('Добро пожаловать в Sportikus!')).toBeInTheDocument();
    expect(screen.getByText('Финал')).toBeInTheDocument();
    // Обучение закончилось — учебной встречи на карте больше нет
    expect(screen.queryByText('Метка учебной встречи')).not.toBeInTheDocument();
  });

  it('«Далее» на шаге с меткой сам открывает карточку учебной встречи', async () => {
    renderWithRouter(['/?tour=1']);
    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByText('Далее'));

    expect(await screen.findByText('Карточка встречи')).toBeInTheDocument();
    expect(screen.getByText('Подать заявку')).toBeInTheDocument();
  });

  it('пропуск обучения посреди записи убирает учебную встречу', async () => {
    renderWithRouter(['/?tour=1']);
    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('Далее'));
    expect(await screen.findByText('Метка учебной встречи')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Пропустить обучение'));
    expect(screen.queryByText('Метка учебной встречи')).not.toBeInTheDocument();
  });
});
