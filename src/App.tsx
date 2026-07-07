import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CollaboratorListPage from './pages/CollaboratorListPage';
import CollaboratorDetailPage from './pages/CollaboratorDetailPage';
import UserListPage from './pages/UserListPage';
import UserDetailPage from './pages/UserDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collaborators"
            element={
              <ProtectedRoute>
                <CollaboratorListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collaborators/:employeeCode"
            element={
              <ProtectedRoute>
                <CollaboratorDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminRoute>
                <UserListPage />
              </AdminRoute>
            }
          />
          <Route
            path="/users/:username"
            element={
              <AdminRoute>
                <UserDetailPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
