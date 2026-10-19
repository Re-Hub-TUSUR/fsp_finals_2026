import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DemoRoleBar } from './components/DemoRoleBar';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { CreateEventPage } from './pages/CreateEventPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          {/* Top Floating Demo Role Switcher for Hackathon Experts */}
          <DemoRoleBar />

          {/* Main Navigation Bar */}
          <Navbar />

          {/* Main Content View */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<HomePage />} />
              <Route path="/events/new" element={<CreateEventPage />} />
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
