import { describe, expect, it } from 'vitest';
import { authLink, safeNext } from './redirect';

describe('safeNext', () => {
  it('пропускает внутренние пути', () => {
    expect(safeNext('/events/5')).toBe('/events/5');
    expect(safeNext('/?view=list')).toBe('/?view=list');
  });

  it('отбрасывает внешние адреса и пустое значение', () => {
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });

  it('не возвращает на гостевые страницы', () => {
    expect(safeNext('/welcome')).toBe('/');
    expect(safeNext('/auth?mode=user', '/profile')).toBe('/profile');
  });
});

describe('authLink', () => {
  it('собирает режим и возврат', () => {
    expect(authLink('login')).toBe('/auth');
    expect(authLink('user', '/events/7')).toBe('/auth?mode=user&next=%2Fevents%2F7');
  });
});
