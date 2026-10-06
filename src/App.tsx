import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/home/Home';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/dashboard/Dashboard';
import Bookings from './pages/bookings/Bookings';
import MyBookings from './pages/bookings/MyBookings';
import Infrastructure from './pages/infrastructure/Infrastructure';
import UsersAdmin from './pages/admin/Users';
import AdminBookings from './pages/admin/Bookings';
import SettingsPage from './pages/admin/Settings';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Home />} />
          
          {/* Auth Routes (Standalone) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Main App Layout (Public & Protected) */}
          <Route element={<MainLayout />}>
            {/* Dashboard and Bookings allow guest view now */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />

            {/* Requires authentication */}
            <Route element={<ProtectedRoute />}>
              <Route path="my-bookings" element={<MyBookings />} />
            </Route>

            {/* Infrastructure management (Maintenance staff + Managers + Owner) */}
            <Route element={<ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'MAINTENANCE']} />}>
              <Route path="infrastructure" element={<Infrastructure />} />
            </Route>

            {/* Owner Only */}
            <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
              <Route path="users" element={<UsersAdmin />} />
            </Route>

            {/* Shared (Owner + Staff) */}
            <Route element={<ProtectedRoute allowedRoles={['OWNER', 'CASHIER', 'MANAGER']} />}>
<Route path="admin-bookings" element={<AdminBookings />} />
            <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
