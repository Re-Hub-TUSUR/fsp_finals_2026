import { AxiosError } from 'axios';
import { act, render, screen } from '@testing-library/react';
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
];

const KRASNOYARSK: City = { id: 1, name: 'Красноярск', lat: 56.01, lng: 92.85, timeZone: 'Asia/Krasnoyarsk' };
const MOSCOW: City = { id: 2, name: 'Москва', lat: 55.75, lng: 37.62, timeZone: 'Europe/Moscow' };

const SAVED: Preferences = {
  sports: [SPORTS[0]],
  skillLevel: 'PRO',
  homeCity: KRASNOYARSK,
  homeLat: 56.1,
  homeLng: 92.8,
  maxDistanceKm: 30,
  preferredTimes: ['MORNING'],
  maxPrice: 500,
  birthYear: 1990,
  configured: true,
};

async function renderQuiz(props: Partial<React.ComponentProps<typeof InterestQuiz>> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn().mockResolvedValue(undefined);
  render(<InterestQuiz onClose={onClose} onSaved={onSaved} {...props} />);
  await act(async () => {});
  await screen.findByText('Чего вам сейчас хочется?');
  return { onClose, onSaved, user: userEvent.setup() };
}

const click = (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) =>
  user.click(screen.getByRole('button', { name }));

const next = (user: ReturnType<typeof userEvent.setup>) => click(user, /Дальше/);

/** Свежий проход по всем шагам с минимальными ответами; возвращает аргумент preferencesApi.update. */
async function finishFresh(user: ReturnType<typeof userEvent.setup>, mood = 'Быть в команде') {
  await click(user, new RegExp(mood));
  await next(user);
  await next(user); // виды спорта: подставило настроение
  await click(user, /Вечером/);
  await next(user);
  await click(user, /Уже в теме/);
  await next(user);
  await user.selectOptions(screen.getByRole('combobox'), String(KRASNOYARSK.id));
  await click(user, /Собрать профиль/);
  return vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0];
}

describe('InterestQuiz', () => {
  beforeEach(() => {
    vi.mocked(catalogApi.sports).mockResolvedValue(SPORTS);
    vi.mocked(citiesApi.list).mockResolvedValue([KRASNOYARSK, MOSCOW]);
    vi.mocked(preferencesApi.update).mockReset();
    vi.mocked(preferencesApi.update).mockResolvedValue({} as never);
  });

  it('настроение подставляет подходящие виды спорта и они уходят в предпочтения', async () => {
    const { user, onSaved } = await renderQuiz();
    const payload = await finishFresh(user, 'Быть в команде');

    expect(payload?.sportIds).toEqual([2]);
    expect(payload).toMatchObject({
      skillLevel: 'AMATEUR',
      homeCityId: KRASNOYARSK.id,
      preferredTimes: ['EVENING'],
      maxDistanceKm: 20,
      maxPrice: undefined,
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('без настроения дальше не пойти, а без вида спорта — нельзя пройти шаг видов', async () => {
    const { user } = await renderQuiz();
    expect(screen.getByRole('button', { name: /Дальше/ })).toBeDisabled();

    await click(user, /Пробовать новое/);
    await next(user);
    // «Пробовать новое» подставило только шахматы: снимаем их — выбора не осталось
    expect(screen.getByRole('button', { name: /Дальше/ })).toBeEnabled();
    await click(user, /Шахматы/);
    expect(screen.getByRole('button', { name: /Дальше/ })).toBeDisabled();
    await click(user, /Шахматы/);
    expect(screen.getByRole('button', { name: /Дальше/ })).toBeEnabled();
  });

  it('уровень нужно выбрать явно — по умолчанию «Начинаю» не подставляется', async () => {
    const { user } = await renderQuiz();
    await click(user, /Быть в команде/);
    await next(user);
    await next(user);
    await click(user, /Вечером/);
    await next(user);

    expect(screen.getByRole('button', { name: /Дальше/ })).toBeDisabled();
    await click(user, /Начинаю/);
    expect(screen.getByRole('button', { name: /Дальше/ })).toBeEnabled();
  });

  it('смена настроения заменяет подставленное, но не трогает выбранное вручную', async () => {
    const { user } = await renderQuiz();
    await click(user, /Быть в команде/);
    await next(user); // подставлен Футбол
    await user.click(screen.getByRole('button', { name: /Шахматы/ })); // вручную добавили шахматы
    await click(user, /Назад/);
    await click(user, /Поймать баланс/);
    await next(user); // руками правили — набор остаётся прежним

    await next(user);
    await click(user, /Вечером/);
    await next(user);
    await click(user, /Уже в теме/);
    await next(user);
    await user.selectOptions(screen.getByRole('combobox'), String(KRASNOYARSK.id));
    await click(user, /Собрать профиль/);

    const payload = vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0];
    expect([...(payload?.sportIds ?? [])].sort()).toEqual([2, 3]);
  });

  it('смена настроения без ручных правок меняет подсказку целиком', async () => {
    const { user } = await renderQuiz();
    await click(user, /Быть в команде/);
    await next(user);
    await click(user, /Назад/);
    await click(user, /Поймать баланс/);
    await next(user); // Йога вместо Футбола

    await next(user);
    await click(user, /Вечером/);
    await next(user);
    await click(user, /Уже в теме/);
    await next(user);
    await user.selectOptions(screen.getByRole('combobox'), String(KRASNOYARSK.id));
    await click(user, /Собрать профиль/);

    expect(vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0].sportIds).toEqual([4]);
  });

  it('повторное прохождение сохраняет домашнюю точку, бюджет и год рождения', async () => {
    const { user } = await renderQuiz({ initial: SAVED });
    await click(user, /Больше энергии/);
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await click(user, /Собрать профиль/);

    expect(vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0]).toEqual({
      sportIds: [1],
      skillLevel: 'PRO',
      homeCityId: KRASNOYARSK.id,
      homeLat: 56.1,
      homeLng: 92.8,
      maxDistanceKm: 30,
      preferredTimes: ['MORNING'],
      maxPrice: 500,
      birthYear: 1990,
    });
  });

  it('при смене города домашняя точка не переносится', async () => {
    const { user } = await renderQuiz({ initial: SAVED });
    await click(user, /Больше энергии/);
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await user.selectOptions(screen.getByRole('combobox'), String(MOSCOW.id));
    await click(user, /Собрать профиль/);

    const payload = vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0];
    expect(payload).toMatchObject({ homeCityId: MOSCOW.id, homeLat: undefined, homeLng: undefined });
  });

  it('«Только бесплатные» превращается в maxPrice = 0 и перекрывает прежний бюджет', async () => {
    const { user } = await renderQuiz({ initial: SAVED });
    await click(user, /Больше энергии/);
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await click(user, /Только бесплатные события/);
    await click(user, /Собрать профиль/);

    expect(vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0].maxPrice).toBe(0);
  });

  it('снятие «только бесплатные» не оставляет нулевой бюджет', async () => {
    const { user } = await renderQuiz({ initial: { ...SAVED, maxPrice: 0 } });
    await click(user, /Больше энергии/);
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await click(user, /Только бесплатные события/);
    await click(user, /Собрать профиль/);

    expect(vi.mocked(preferencesApi.update).mock.calls.at(-1)?.[0].maxPrice).toBeUndefined();
  });

  it('финальная кнопка вызывает onFinish, а если его нет — onClose', async () => {
    const onFinish = vi.fn();
    const first = await renderQuiz({ initial: SAVED, onFinish });
    await click(first.user, /Больше энергии/);
    for (let i = 0; i < 4; i++) await next(first.user);
    await click(first.user, /Собрать профиль/);
    await click(first.user, /Смотреть рекомендации/);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(first.onClose).not.toHaveBeenCalled();
  });

  it('без onFinish финальная кнопка закрывает квиз', async () => {
    const { user, onClose } = await renderQuiz({ initial: SAVED });
    await click(user, /Больше энергии/);
    for (let i = 0; i < 4; i++) await next(user);
    await click(user, /Собрать профиль/);
    await click(user, /Смотреть рекомендации/);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ошибка сохранения показывается и не переводит на финальный экран', async () => {
    const error = new AxiosError('fail');
    error.response = {
      data: { error: { message: 'Город не найден' } },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    };
    vi.mocked(preferencesApi.update).mockRejectedValue(error);

    const { user, onSaved } = await renderQuiz({ initial: SAVED });
    await click(user, /Больше энергии/);
    for (let i = 0; i < 4; i++) await next(user);
    await click(user, /Собрать профиль/);

    expect(await screen.findByRole('alert')).toHaveTextContent('Город не найден');
    expect(screen.queryByText('Мы поймали ваш ритм')).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
