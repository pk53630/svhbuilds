import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import BuildingDetailPage from './pages/BuildingDetailPage.jsx';
import RaiseRequestPage from './pages/RaiseRequestPage.jsx';
import TicketListPage from './pages/TicketListPage.jsx';
import SuperAdminPage from './pages/SuperAdminPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import WaitlistPage from './pages/WaitlistPage.jsx';
import LpgPage from './pages/LpgPage.jsx';
import DieselPage from './pages/DieselPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import RentTrackingPage from './pages/RentTrackingPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';

function Protected({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  // First-login residents must set their own password before doing anything else.
  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      {user && <Navbar />}
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route
            path="/"
            element={
              <Protected>
                <HomePage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId"
            element={
              <Protected>
                <BuildingDetailPage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId/raise-request"
            element={
              <Protected>
                <RaiseRequestPage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId/tickets"
            element={
              <Protected>
                <TicketListPage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId/users"
            element={
              <Protected>
                <AdminUsersPage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId/waitlist"
            element={
              <Protected>
                <WaitlistPage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId/lpg"
            element={
              <Protected>
                <LpgPage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId/diesel"
            element={
              <Protected>
                <DieselPage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId/maintenance"
            element={
              <Protected>
                <MaintenancePage />
              </Protected>
            }
          />
          <Route
            path="/buildings/:buildingId/rent"
            element={
              <Protected>
                <RentTrackingPage />
              </Protected>
            }
          />
          <Route
            path="/super-admin"
            element={
              <Protected>
                <SuperAdminPage />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
