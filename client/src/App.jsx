import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Sessions from './pages/Sessions';
import Payments from './pages/Payments';
import Attendance from './pages/Attendance';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import Structure from './pages/Structure';
import Payroll from './pages/Payroll';
import AuditLog from './pages/AuditLog';
import UserManual from './pages/UserManual';
import ControllerHome from './pages/ControllerHome';
import TeacherPortal from './pages/TeacherPortal';

function CatchAll() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.teacher_id) return <Navigate to="/teacher" replace />;
  return <Navigate to="/sessions" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Teacher portal */}
            <Route element={<PrivateRoute />}>
              <Route path="/teacher" element={<TeacherPortal />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<PrivateRoute adminOnly />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/audit-log" element={<AuditLog />} />
            </Route>

            {/* All authenticated users */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Sessions />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/home" element={<Navigate to="/sessions" replace />} />
              <Route path="/students" element={<Students />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/structure" element={<Structure />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/manual" element={<UserManual />} />
            </Route>

            <Route path="*" element={<CatchAll />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
