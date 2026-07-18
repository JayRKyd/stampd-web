import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Landing from '@/pages/Landing';
import Merchants from '@/pages/Merchants';
import DashboardLayout from '@/pages/dashboard/Layout';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import Confirmed from '@/pages/auth/Confirmed';
import Privacy from '@/pages/legal/Privacy';
import Terms from '@/pages/legal/Terms';
import NotFound from '@/pages/NotFound';
import Dashboard from '@/pages/dashboard/Dashboard';
import Stamp from '@/pages/dashboard/Stamp';
import Customers from '@/pages/dashboard/Customers';
import CardPage from '@/pages/dashboard/Card';
import Analytics from '@/pages/dashboard/Analytics';
import Notifications from '@/pages/dashboard/Notifications';
import Settings from '@/pages/dashboard/Settings';
import Onboarding from '@/pages/dashboard/Onboarding';
import Admin from '@/pages/Admin';

export default function App() {
  return (
    <div className="w-full min-w-0 flex-1">
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/merchants" element={<Merchants />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/confirmed" element={<Confirmed />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stamp" element={<Stamp />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/card" element={<CardPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </div>
  );
}
