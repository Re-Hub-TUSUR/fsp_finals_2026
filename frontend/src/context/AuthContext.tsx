import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import type { Preferences, User } from '../types';
import { authApi, preferencesApi } from '../api';
import { getToken, setToken } from '../api/client';
import { clearPersonalOfflineData } from '../pwa';

export const DEMO_PASSWORD = 'password123';

export type DemoRoleKey = 'user' | 'olga' | 'pro' | 'masha' | 'enisey' | 'ladya' | 'admin';

/** Демо-аккаунты из сида БД: переключение роли = вход под этим аккаунтом по-настоящему (JWT). */
export const DEMO_ACCOUNTS: Record<DemoRoleKey, { email: string; label: string; hint: string }> = {
  user: { email: 'user@sport.ru', label: '🏃 Иван', hint: 'Пользователь — автор «Дворового футбола»' },
  olga: { email: 'olga@sport.ru', label: '🙋 Ольга', hint: 'Пользователь-новичок' },
  pro: { email: 'pro@sport.ru', label: '🎯 Алексей', hint: 'Пользователь-профи' },
  masha: { email: 'masha@sport.ru', label: '🚴 Мария (Москва)', hint: 'Пользователь из Москвы — рекомендации в другом городе и часовом поясе' },
  enisey: { email: 'enisey@sport.ru', label: '🏆 СК «Енисей»', hint: 'Одобренная организация' },
  ladya: { email: 'ladya@sport.ru', label: '⏳ Клуб «Ладья»', hint: 'Организация на модерации' },
  admin: { email: 'admin@sport.ru', label: '🛡️ Администратор', hint: 'Модерация платформы' },
};

const ROLE_KEY = 'sportikus_demo_role';

interface AuthContextType {
  currentUser: User | null;
  activeRoleKey: DemoRoleKey;
  ready: boolean;
  authError: string | null;
  switchRole: (roleKey: DemoRoleKey) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  acceptAuth: (token: string, user: User) => void;
  logout: () => void;
  /** Перечитать профиль (например, после одобрения организации администратором). */
  refreshUser: () => Promise<void>;
  /** Интересы и домашний город — для рекомендаций, центра карты и подписи города. */
  preferences: Preferences | null;
  refreshPreferences: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function storedRole(): DemoRoleKey {
  try {
    const key = localStorage.getItem(ROLE_KEY) as DemoRoleKey | null;
    if (key && key in DEMO_ACCOUNTS) return key;
  } catch {
    /* ignore */
  }
  return 'user';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRoleKey, setActiveRoleKey] = useState<DemoRoleKey>(storedRole);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  const refreshPreferences = useCallback(async () => {
    try {
      setPreferences(await preferencesApi.get());
    } catch {
      setPreferences(null);
    }
  }, []);

  // Предпочтения принадлежат пользователю — перечитываем при каждой смене аккаунта
  useEffect(() => {
    if (currentUser) void refreshPreferences();
    else setPreferences(null);
  }, [currentUser, refreshPreferences]);

  const loginAs = useCallback(async (roleKey: DemoRoleKey) => {
    const { token, user } = await authApi.login(DEMO_ACCOUNTS[roleKey].email, DEMO_PASSWORD);
    void clearPersonalOfflineData();
    setToken(token);
    setCurrentUser(user);
    setActiveRoleKey(roleKey);
    setAuthError(null);
    try {
      localStorage.setItem(ROLE_KEY, roleKey);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (getToken()) {
          try {
            const user = await authApi.me();
            if (!cancelled) setCurrentUser(user);
            return;
          } catch (error) {
            // Выходим из аккаунта только если сервер отверг токен: без сети (офлайн-PWA) вход сохраняется
            if (error instanceof AxiosError && error.response?.status === 401) setToken(null);
            else if (!cancelled) setAuthError('Не удалось подключиться к серверу');
          }
        }
      } catch {
        if (!cancelled) setAuthError('Не удалось подключиться к серверу');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loginAs]);

  const acceptAuth = useCallback((token: string, user: User) => {
    void clearPersonalOfflineData();
    setToken(token);
    setCurrentUser(user);
    setAuthError(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    acceptAuth(result.token, result.user);
  }, [acceptAuth]);

  const logout = useCallback(() => {
    void clearPersonalOfflineData();
    setToken(null);
    setCurrentUser(null);
  }, []);

  const switchRole = useCallback(
    async (roleKey: DemoRoleKey) => {
      try {
        await loginAs(roleKey);
      } catch (error) {
        setAuthError('Не удалось войти под выбранной ролью');
        throw error;
      }
    },
    [loginAs],
  );

  const refreshUser = useCallback(async () => {
    try {
      setCurrentUser(await authApi.me());
    } catch {
      /* оставляем прежний профиль */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, activeRoleKey, ready, authError, switchRole, login, acceptAuth, logout, refreshUser, preferences, refreshPreferences }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
