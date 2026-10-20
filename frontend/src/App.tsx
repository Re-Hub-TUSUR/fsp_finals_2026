import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { MobileTabBar } from './components/MobileTabBar';
import { HomePage } from './pages/HomePage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventPage } from './pages/EventPage';
import { ManageEventPage } from './pages/ManageEventPage';
import { MyEventsPage } from './pages/MyEventsPage';
import { AdminPage } from './pages/AdminPage';
import { RecommendedPage } from './pages/RecommendedPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AuthPage } from './pages/AuthPage';
import { OwnProfilePage, ProfilePage } from './pages/ProfilePage';
import { AchievementToast } from './components/AchievementToast';
import { InstallAppBanner, OfflineBanner } from './components/PwaBanners';
import { LandingPage } from './pages/LandingPage';
import { GuestHeader } from './components/landing/GuestHeader';
import { getToken } from './api/client';
import { GUEST_PATHS } from './utils/redirect';

/** Плавное появление страницы при смене маршрута. «/» и «/events» — одна и та же страница. */
function PageFade({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname === '/' ? '/events' : pathname} className="anim-fade h-full">
      {children}
    </div>
  );
}

/**
 * Каркас приложения. Гость видит только лендинг и вход: любой другой адрес ведёт на /welcome
 * с ?next=, чтобы после входа вернуться туда, куда человек шёл (например, по ссылке на событие).
 */
function AppShell() {
  const { currentUser, ready } = useAuth();
  const { pathname, search } = useLocation();

  // Пока проверяем сохранённый токен, ничего не решаем — иначе вошедшего на миг перекинет на лендинг
  if (!ready) return <div className="h-dvh bg-page" />;

  const isGuestPath = GUEST_PATHS.includes(pathname);
  // Токен остался, но сервер недоступен (офлайн-PWA): не выгоняем на лендинг, приложение работает из кэша
  const offlineSession = !currentUser && getToken() !== null;
  const guest = !currentUser && !offlineSession;

  if (guest && !isGuestPath) {
    const target = pathname + search;
    return <Navigate to={target === '/' ? '/welcome' : `/welcome?next=${encodeURIComponent(target)}`} replace />;
  }

  return (
    /* Каркас на всю высоту: шапка и нижняя навигация фиксированы, прокручивается только контент */
    <div className="h-dvh flex flex-col bg-page text-ink font-sans max-w-full overflow-x-hidden">
      <AchievementToast />
      <OfflineBanner />
      {guest ? <GuestHeader /> : <Navbar />}

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-w-full">
        <PageFade>
        <Routes>
          <Route path="/welcome" element={guest ? <LandingPage /> : <Navigate to="/" replace />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<HomePage />} />
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventPage />} />
          <Route path="/events/:id/manage" element={<ManageEventPage />} />
          <Route path="/my" element={<MyEventsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/recommended" element={<RecommendedPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<OwnProfilePage />} />
          <Route path="/profiles/:type/:id" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </PageFade>
      </main>

      {!guest && <InstallAppBanner />}
      {!guest && <MobileTabBar />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
