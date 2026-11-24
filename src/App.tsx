import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MockDataProvider } from './context/MockDataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './layouts/Layout';
import { ToastHost } from './components/Toast';

// Modules import
import { Login } from './modules/auth/Login';
import { Overview } from './modules/dashboard/Overview';
import { UsersDirectory } from './modules/users/UsersDirectory';
import { HostsDirectory } from './modules/hosts/HostsDirectory';
import { HostProfile } from './modules/hosts/HostProfile';
import { HostApplications } from './modules/hosts/HostApplications';
import { ExperiencesList } from './modules/experiences/ExperiencesList';
import { CreateExperience } from './modules/experiences/CreateExperience';
import { BookingsDirectory } from './modules/bookings/BookingsDirectory';
import { JoinRequestsDirectory } from './modules/requests/JoinRequestsDirectory';
import { PaymentsDirectory } from './modules/payments/PaymentsDirectory';
import { CitiesDirectory } from './modules/cities/CitiesDirectory';
import { ReviewsDirectory } from './modules/reviews/ReviewsDirectory';
import { ReportsDirectory } from './modules/reports/ReportsDirectory';
import { BlogsDirectory } from './modules/blogs/BlogsDirectory';
import { LandingPagesDirectory } from './modules/landing-pages/LandingPagesDirectory';
import { MarketingDirectory } from './modules/marketing/MarketingDirectory';
import { NotificationsComposer } from './modules/notifications/NotificationsComposer';
import { BillingPage } from './modules/billing/BillingPage';
import { BoostsQueue } from './modules/boosts/BoostsQueue';
import { BoostReview } from './modules/boosts/BoostReview';
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
  const { initializing, user } = useAuth();
  // The marketing login (role "marketing") only gets the Event marketing
  // section; the backend refuses it everywhere else, and any 401 logs out.
  const isMarketing = user?.role === 'marketing';

  // Avoid redirecting a valid session to /login before the persisted token
  // has been validated against the backend.
  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080914]">
        <div className="flex flex-col items-center gap-3 text-white/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#A020F0] border-t-transparent" />
          <p className="text-sm">Loading console…</p>
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

      {/* The experience editor is a full-screen page in the brand's dark
          look, laid out like the host dashboard's editor — no sidebar. */}
      <Route
        path="/experiences/new"
        element={
          <ProtectedRoute>
            {isMarketing ? <Navigate to="/event-marketing" replace /> : <CreateExperience />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/experiences/:id/edit"
        element={
          <ProtectedRoute>
            {isMarketing ? <Navigate to="/event-marketing" replace /> : <CreateExperience />}
          </ProtectedRoute>
        }
      />

      {/* Authenticated Dashboard Panel Routes wrapped in main Layout shell */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout globalSearch={globalSearch} onSearchChange={setGlobalSearch}>
              {isMarketing ? (
                <Routes>
                  <Route path="/event-marketing" element={<LandingPagesDirectory />} />
                  <Route path="*" element={<Navigate to="/event-marketing" replace />} />
                </Routes>
              ) : (
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/users" element={<UsersDirectory searchQuery={globalSearch} />} />
                <Route path="/hosts" element={<HostsDirectory searchQuery={globalSearch} />} />
                <Route path="/hosts/:hostId" element={<HostProfile />} />
                <Route path="/host-applications" element={<HostApplications />} />
                <Route path="/experiences" element={<ExperiencesList searchQuery={globalSearch} />} />
                <Route path="/bookings" element={<BookingsDirectory searchQuery={globalSearch} />} />
                <Route path="/join-requests" element={<JoinRequestsDirectory />} />
                <Route path="/payments" element={<PaymentsDirectory />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/boosts" element={<BoostsQueue />} />
                <Route path="/boosts/:id" element={<BoostReview />} />
                <Route path="/cities" element={<CitiesDirectory />} />
                <Route path="/reviews" element={<ReviewsDirectory />} />
                <Route path="/reports" element={<ReportsDirectory />} />
                <Route path="/blogs" element={<BlogsDirectory />} />
                <Route path="/event-marketing" element={<LandingPagesDirectory />} />
                <Route path="/marketing" element={<MarketingDirectory />} />
                <Route path="/notifications" element={<NotificationsComposer />} />
                <Route path="/settings" element={<SettingsManager />} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              )}
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
        {/* Single toast outlet for the whole app — toast.* is a module-level
            store, so without one mounted here the calls render nowhere. */}
        <ToastHost />
      </MockDataProvider>
    </AuthProvider>
  );
}

export default App;
