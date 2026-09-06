import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LogPage } from './pages/LogPage';
import { InsightsPage } from './pages/InsightsPage';
import { GoalsPage } from './pages/GoalsPage';
import { ImportPage } from './pages/ImportPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<LogPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/import" element={<ImportPage />} />
          {/* Legacy routes */}
          <Route path="/chat" element={<Navigate to="/" replace />} />
          <Route path="/meals" element={<Navigate to="/insights?tab=meals" replace />} />
          <Route path="/reports" element={<Navigate to="/insights?tab=reports" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
