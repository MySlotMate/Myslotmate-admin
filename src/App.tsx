import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MockDataProvider } from './context/MockDataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './layouts/Layout';

// Modules import
import { Login } from './modules/auth/Login';
import { Overview } from './modules/dashboard/Overview';
import { UsersDirectory } from './modules/users/UsersDirectory';
import { HostsDirectory } from './modules/hosts/HostsDirectory';
import { HostProfile } from './modules/hosts/HostProfile';
import { ExperiencesList } from './modules/experiences/ExperiencesList';
import { CreateExperience } from './modules/experiences/CreateExperience';
import { BookingsDirectory } from './modules/bookings/BookingsDirectory';
import { PaymentsDirectory } from './modules/payments/PaymentsDirectory';
import { CitiesDirectory } from './modules/cities/CitiesDirectory';
import { ReviewsDirectory } from './modules/reviews/ReviewsDirectory';
import { ReportsDirectory } from './modules/reports/ReportsDirectory';
import { BlogsDirectory } from './modules/blogs/BlogsDirectory';
import { MarketingDirectory } from './modules/marketing/MarketingDirectory';
import { NotificationsComposer } from './modules/notifications/NotificationsComposer';
import { SettingsManager } from './modules/settings/SettingsManager';

interface RouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<RouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AnonymousRoute: React.FC<RouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AppContent: React.FC = () => {
  const [globalSearch, setGlobalSearch] = useState('');
  const { initializing } = useAuth();

  // Avoid redirecting a valid session to /login before the persisted token
  // has been validated against the backend.
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shell">
        <div className="flex flex-col items-center gap-3 text-mist">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-xs font-bold uppercase tracking-[0.22em]">Loading console…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Unauthenticated Login page Route */}
      <Route
        path="/login"
        element={
          <AnonymousRoute>
            <Login />
          </AnonymousRoute>
        }
      />

      {/* Authenticated Dashboard Panel Routes wrapped in main Layout shell */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout globalSearch={globalSearch} onSearchChange={setGlobalSearch}>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/users" element={<UsersDirectory searchQuery={globalSearch} />} />
                <Route path="/hosts" element={<HostsDirectory searchQuery={globalSearch} />} />
                <Route path="/hosts/:hostId" element={<HostProfile />} />
                <Route path="/experiences" element={<ExperiencesList searchQuery={globalSearch} />} />
                <Route path="/experiences/new" element={<CreateExperience />} />
                <Route path="/bookings" element={<BookingsDirectory searchQuery={globalSearch} />} />
                <Route path="/payments" element={<PaymentsDirectory />} />
                <Route path="/cities" element={<CitiesDirectory />} />
                <Route path="/reviews" element={<ReviewsDirectory />} />
                <Route path="/reports" element={<ReportsDirectory />} />
                <Route path="/blogs" element={<BlogsDirectory />} />
                <Route path="/marketing" element={<MarketingDirectory />} />
                <Route path="/notifications" element={<NotificationsComposer />} />
                <Route path="/settings" element={<SettingsManager />} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <MockDataProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </MockDataProvider>
    </AuthProvider>
  );
}

export default App;
