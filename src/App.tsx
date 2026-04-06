import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DayProvider }          from './context/DayContext'
import PrivateRoute  from './components/PrivateRoute'
import AdminRoute    from './components/AdminRoute'
import Login         from './pages/Login'
import Register      from './pages/Register'
import Dashboard     from './pages/Dashboard'
import AdminPage     from './pages/admin/AdminPage'
import Setup         from './pages/Setup'

/** Redireciona / → /dashboard (logado) ou /login (não logado) */
function RootRedirect() {
  const { currentUser } = useAuth()
  return <Navigate to={currentUser ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DayProvider>
          <Routes>
            {/* Public */}
            <Route path="/"         element={<RootRedirect />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected — any authenticated user */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            {/* Protected — admin only */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />

            {/* One-time admin setup — DELETE after use */}
            <Route path="/setup" element={<PrivateRoute><Setup /></PrivateRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DayProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
