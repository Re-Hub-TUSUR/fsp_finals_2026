import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DemoRoleBar } from './components/DemoRoleBar';
import { Navbar } from './components/Navbar';
import { MobileTabBar } from './components/MobileTabBar';
import { HomePage } from './pages/HomePage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventPage } from './pages/EventPage';
import { ManageEventPage } from './pages/ManageEventPage';
import { MyEventsPage } from './pages/MyEventsPage';
import { AdminPage } from './pages/AdminPage';
import { RecommendedPage } from './pages/RecommendedPage';
import { AuthPage } from './pages/AuthPage';
import { OwnProfilePage, ProfilePage } from './pages/ProfilePage';
import { AchievementToast } from './components/AchievementToast';

/** Плавное появление страницы при смене маршрута. «/» и «/events» — одна и та же страница. */
function PageFade({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname === '/' ? '/events' : pathname} className="anim-fade h-full">
      {children}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Каркас на всю высоту: шапка и нижняя навигация фиксированы, прокручивается только контент */}
          <div className="h-dvh flex flex-col bg-page text-ink font-sans max-w-full overflow-x-hidden">
            <AchievementToast />
            {/* Демо-панель для жюри: вход под любым сидовым аккаунтом в 1 клик */}
            <DemoRoleBar />

            <Navbar />

            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-w-full">
              <PageFade>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/events" element={<HomePage />} />
                <Route path="/events/new" element={<CreateEventPage />} />
                <Route path="/events/:id" element={<EventPage />} />
                <Route path="/events/:id/manage" element={<ManageEventPage />} />
                <Route path="/my" element={<MyEventsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/recommended" element={<RecommendedPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/profile" element={<OwnProfilePage />} />
                <Route path="/profiles/:type/:id" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </PageFade>
            </main>

            <MobileTabBar />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
