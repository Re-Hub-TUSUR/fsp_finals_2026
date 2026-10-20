import { AxiosError } from 'axios';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { City, Preferences, Sport } from '../types';
import { catalogApi, citiesApi, preferencesApi } from '../api';
import { InterestQuiz } from './InterestQuiz';

vi.mock('../api', () => ({
  catalogApi: { sports: vi.fn() },
  citiesApi: { list: vi.fn() },
  preferencesApi: { update: vi.fn() },
}));

const SPORTS: Sport[] = [
  { id: 1, name: 'Бег', slug: 'beg', custom: false },
  { id: 2, name: 'Футбол', slug: 'futbol', custom: false },
  { id: 3, name: 'Шахматы', slug: 'shahmaty', custom: false },
  { id: 4, name: 'Йога', slug: 'yoga', custom: false },
  { id: 5, name: 'Плавание', slug: 'plavanie', custom: false },
];
const KRASNOYARSK: City = { id: 1, name: 'Красноярск', region: 'Красноярский край', lat: 56.01, lng: 92.85, timeZone: 'Asia/Krasnoyarsk' };
const MOSCOW: City = { id: 2, name: 'Москва', lat: 55.75, lng: 37.62, timeZone: 'Europe/Moscow' };

const SAVED: Preferences = {
  sports: [SPORTS[0]], skillLevel: 'PRO',
  homeCity: KRASNOYARSK,
  homeLat: 56.1, homeLng: 92.8, maxDistanceKm: 30,
  preferredTimes: ['MORNING'], maxPrice: 500, birthYear: 1990, configured: true,
};

async function renderQuiz(initial?: Preferences) {
  const onClose = vi.fn();
  const onSaved = vi.fn().mockResolvedValue(undefined);
  render(<InterestQuiz initial={initial} onClose={onClose} onSaved={onSaved} />);
  await act(async () => {});
  await screen.findByText('В каком году вы родились?');
  return { user: userEvent.setup(), onClose, onSaved };
}

async function goToSports(user: ReturnType<typeof userEvent.setup>, year: string, leisure = 'Активный') {
  await user.clear(screen.getByRole('spinbutton', { name: 'Год рождения' }));
  await user.type(screen.getByRole('spinbutton', { name: 'Год рождения' }), year);
  await user.click(screen.getByRole('button', { name: /Дальше/ }));
  await user.click(screen.getByRole('button', { name: new RegExp(leisure) }));
  await user.click(screen.getByRole('button', { name: /Дальше/ }));
  await user.click(screen.getByRole('button', { name: /Вечер/ }));
  await user.click(screen.getByRole('button', { name: /Дальше/ }));
}

describe('InterestQuiz', () => {
  beforeEach(() => {
    vi.mocked(catalogApi.sports).mockResolvedValue(SPORTS);
    vi.mocked(citiesApi.list).mockResolvedValue([KRASNOYARSK, MOSCOW]);
    vi.mocked(preferencesApi.update).mockReset();
    vi.mocked(preferencesApi.update).mockResolvedValue({} as never);
  });

  it('начинается с года рождения и содержит пять вопросов', async () => {
    await renderQuiz();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Дальше/ })).toBeDisabled();
  });

  it('не принимает будущий или слишком ранний год', async () => {
    const { user } = await renderQuiz();
    await user.type(screen.getByRole('spinbutton', { name: 'Год рождения' }), '1899');
    expect(screen.getByText(/Введите год от 1900/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Дальше/ })).toBeDisabled();
  });

  it('показывает рекомендованные и остальные виды спорта отдельно', async () => {
    const { user } = await renderQuiz();
    await goToSports(user, '2000', 'Активный');
    const suggested = screen.getByRole('heading', { name: 'Возможно, вам понравится' }).closest('section')!;
    expect(within(suggested).getByRole('button', { name: /Бег/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Остальные виды спорта' })).toBeInTheDocument();
  });

  it('учитывает возраст вместе с типом досуга', async () => {
    const { user } = await renderQuiz();
    await goToSports(user, '1960', 'Спокойный');
    const suggested = screen.getByRole('heading', { name: 'Возможно, вам понравится' }).closest('section')!;
    expect(within(suggested).getByRole('button', { name: /Шахматы/ })).toBeInTheDocument();
    expect(within(suggested).getByRole('button', { name: /Йога/ })).toBeInTheDocument();
    expect(within(suggested).queryByRole('button', { name: /Бег/ })).not.toBeInTheDocument();
  });

  it('сохраняет год, время и выбранный спорт в профиле', async () => {
    const { user, onSaved } = await renderQuiz();
    await goToSports(user, '2000');
    await user.click(screen.getByRole('button', { name: /Бег/ }));
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Город' }), String(KRASNOYARSK.id));
    await user.click(screen.getByRole('button', { name: /Собрать профиль/ }));
    expect(vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0]).toMatchObject({ sportIds: [1], birthYear: 2000, preferredTimes: ['EVENING'], homeCityId: 1, maxDistanceKm: 25 });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('при повторном прохождении не стирает остальные настройки профиля', async () => {
    const { user } = await renderQuiz(SAVED);
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.click(screen.getByRole('button', { name: /Активный/ }));
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.click(screen.getByRole('button', { name: /Собрать профиль/ }));
    expect(vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0]).toEqual({
      sportIds: [1], birthYear: 1990, preferredTimes: ['MORNING'], skillLevel: 'PRO',
      homeCityId: 1, homeLat: 56.1, homeLng: 92.8, maxDistanceKm: 30, maxPrice: 500,
    });
  });

  it('показывает ошибку сохранения и остаётся в опросе', async () => {
    const error = new AxiosError('fail');
    error.response = { data: { error: { message: 'Не удалось сохранить' } }, status: 400, statusText: 'Bad Request', headers: {}, config: {} as never };
    vi.mocked(preferencesApi.update).mockRejectedValue(error);
    const { user, onSaved } = await renderQuiz();
    await goToSports(user, '2000');
    await user.click(screen.getByRole('button', { name: /Бег/ }));
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Город' }), String(KRASNOYARSK.id));
    await user.click(screen.getByRole('button', { name: /Собрать профиль/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('сохраняет радиус, бесплатные события и сбрасывает координаты при смене города', async () => {
    const { user } = await renderQuiz(SAVED);
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.click(screen.getByRole('button', { name: /Активный/ }));
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.click(screen.getByRole('button', { name: /Дальше/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Город' }), String(MOSCOW.id));
    await user.click(screen.getByRole('button', { name: /Только бесплатные события/ }));
    await user.click(screen.getByRole('button', { name: /Собрать профиль/ }));
    expect(vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0]).toMatchObject({ homeCityId: 2, homeLat: undefined, homeLng: undefined, maxDistanceKm: 30, maxPrice: 0 });
  });
});
