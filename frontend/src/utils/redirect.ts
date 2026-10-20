/** Адреса, которые видны без входа. Остальные ведут гостя на приветственную страницу. */
export const GUEST_PATHS = ['/welcome', '/auth'];

/**
 * Куда вернуть пользователя после входа. Принимаем только внутренние пути вида «/…»:
 * «//evil.com» и «https://…» отбрасываем, иначе ?next= превращается в open redirect.
 */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return GUEST_PATHS.some((p) => next === p || next.startsWith(`${p}?`)) ? fallback : next;
}

/** Ссылка на вход/регистрацию с возвратом на исходную страницу. */
export function authLink(mode: 'login' | 'user' | 'organization', next?: string): string {
  const params = new URLSearchParams();
  if (mode !== 'login') params.set('mode', mode);
  if (next && next !== '/') params.set('next', next);
  const qs = params.toString();
  return qs ? `/auth?${qs}` : '/auth';
}
