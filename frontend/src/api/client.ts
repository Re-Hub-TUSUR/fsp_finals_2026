import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'sportikus_token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* хранилище недоступно — работаем без сохранения входа */
  }
};

const REQUEST_TIMEOUT_MS = 20_000;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  // Без таймаута зависший сервер оставляет экран в вечной загрузке
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Достаёт человекочитаемое сообщение из ответа вида {"error":{"code","message"}}. */
export function errorMessage(error: unknown, fallback = 'Что-то пошло не так. Попробуйте ещё раз.'): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.error?.message;
    if (typeof message === 'string' && message) return message;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'Сервер слишком долго не отвечает. Попробуйте ещё раз.';
    if (!error.response) return 'Нет связи с сервером. Проверьте подключение.';
  }
  return fallback;
}
