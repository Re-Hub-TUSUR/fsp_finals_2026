import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

export const DEMO_ACCOUNTS: Record<string, User> = {
  user: {
    id: 1,
    email: 'user@sport.ru',
    fullName: 'Иван Иванов',
    role: 'ROLE_USER',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'
  },
  enisey: {
    id: 4,
    email: 'enisey@sport.ru',
    fullName: 'СК «Енисей»',
    role: 'ROLE_ORGANIZER',
    organizationId: 1,
    orgStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=120'
  },
  ladya: {
    id: 5,
    email: 'ladya@sport.ru',
    fullName: 'Клуб «Ладья»',
    role: 'ROLE_ORGANIZER',
    organizationId: 2,
    orgStatus: 'PENDING',
    avatarUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=120'
  },
  admin: {
    id: 6,
    email: 'admin@sport.ru',
    fullName: 'Администратор платформы',
    role: 'ROLE_ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120'
  }
};

interface AuthContextType {
  currentUser: User;
  activeRoleKey: string;
  switchRole: (roleKey: 'user' | 'enisey' | 'ladya' | 'admin') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRoleKey, setActiveRoleKey] = useState<string>(() => {
    return localStorage.getItem('sportikus_demo_role') || 'user';
  });

  const currentUser = DEMO_ACCOUNTS[activeRoleKey] || DEMO_ACCOUNTS.user;

  const switchRole = (roleKey: 'user' | 'enisey' | 'ladya' | 'admin') => {
    setActiveRoleKey(roleKey);
    localStorage.setItem('sportikus_demo_role', roleKey);
  };

  useEffect(() => {
    localStorage.setItem('sportikus_demo_role', activeRoleKey);
  }, [activeRoleKey]);

  return (
    <AuthContext.Provider value={{ currentUser, activeRoleKey, switchRole }}>
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
