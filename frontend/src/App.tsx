import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DemoRoleBar } from './components/DemoRoleBar';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventPage } from './pages/EventPage';
import { ManageEventPage } from './pages/ManageEventPage';
import { MyEventsPage } from './pages/MyEventsPage';
import { AdminPage } from './pages/AdminPage';
import { RecommendedPage } from './pages/RecommendedPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          {/* Демо-панель для жюри: вход под любым сидовым аккаунтом в 1 клик */}
          <DemoRoleBar />

          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<HomePage />} />
              <Route path="/events/new" element={<CreateEventPage />} />
              <Route path="/events/:id" element={<EventPage />} />
              <Route path="/events/:id/manage" element={<ManageEventPage />} />
              <Route path="/my" element={<MyEventsPage />} />
              <Route path="/recommended" element={<RecommendedPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
