import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthPage } from './pages/AuthPage';
import { AchievementToast } from './components/AchievementToast';
// Модуль баннеров крошечный и нужен на каждом экране — отдельный чанк для InstallAppBanner не окупается
import { InstallAppBanner, OfflineBanner } from './components/PwaBanners';
import { LandingPage } from './pages/LandingPage';
import { GuestHeader } from './components/landing/GuestHeader';
import { getToken } from './api/client';
import { GUEST_PATHS } from './utils/redirect';

/*
 * Разбиение бандла по страницам: гость получает только лендинг и вход (они импортируются сразу),
 * а карта 2GIS, QR-сканер, админка и остальные экраны приходят отдельными чанками после входа.
 * Страницы экспортируются именованно, поэтому для React.lazy заворачиваем их в { default }.
 */
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const HomePage = page(() => import('./pages/HomePage'), 'HomePage');
const CreateEventPage = page(() => import('./pages/CreateEventPage'), 'CreateEventPage');
const EventPage = page(() => import('./pages/EventPage'), 'EventPage');
const ManageEventPage = page(() => import('./pages/ManageEventPage'), 'ManageEventPage');
const MyEventsPage = page(() => import('./pages/MyEventsPage'), 'MyEventsPage');
const AdminPage = page(() => import('./pages/AdminPage'), 'AdminPage');
const RecommendedPage = page(() => import('./pages/RecommendedPage'), 'RecommendedPage');
const NotificationsPage = page(() => import('./pages/NotificationsPage'), 'NotificationsPage');
const OwnProfilePage = page(() => import('./pages/ProfilePage'), 'OwnProfilePage');
const ProfilePage = page(() => import('./pages/ProfilePage'), 'ProfilePage');
// Оболочка вошедшего пользователя тоже не нужна гостю
const Navbar = page(() => import('./components/Navbar'), 'Navbar');
const MobileTabBar = page(() => import('./components/MobileTabBar'), 'MobileTabBar');
const OnboardingTour = page(() => import('./components/OnboardingTour'), 'OnboardingTour');

/** Плавное появление страницы при смене маршрута. «/» и «/events» — одна и та же страница. */
function PageFade({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname === '/' ? '/events' : pathname} className="anim-fade h-full">
      {children}
    </div>
  );
}

/** Заглушка на время загрузки чанка страницы. */
function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-label="Загрузка">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line-2 border-t-ink motion-reduce:animate-none" />
    </div>
  );
}

/** Экран старта, пока проверяется сохранённый вход: если сервер отвечает долго — говорим об этом, а не показываем пустоту. */
function StartupLoader() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="h-dvh bg-page flex flex-col items-center justify-center gap-4 px-6 text-center" role="status" aria-label="Загрузка">
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-line-2 border-t-ink motion-reduce:animate-none" />
      {slow && <p className="max-w-xs text-sm text-muted">Сервер отвечает дольше обычного. Ещё немного — и откроем приложение.</p>}
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
  if (!ready) return <StartupLoader />;

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
      {!guest && (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      )}
      <AchievementToast />
      <OfflineBanner />
      {/* Высота как у Navbar, чтобы шапка не прыгала, пока грузится её чанк */}
      {guest ? <GuestHeader /> : (
        <Suspense fallback={<div className="h-16 shrink-0 border-b border-line-2 bg-card" />}>
          <Navbar />
        </Suspense>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-w-full">
        <PageFade>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
        </PageFade>
      </main>

      {!guest && (
        <Suspense fallback={null}>
          <InstallAppBanner />
          <MobileTabBar />
        </Suspense>
      )}
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
