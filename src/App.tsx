import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DayProvider }          from './context/DayContext'
import { ThemeProvider }        from './context/ThemeContext'
import PrivateRoute  from './components/PrivateRoute'
import AdminRoute    from './components/AdminRoute'
import Login         from './pages/Login'
import Register      from './pages/Register'
import Dashboard     from './pages/Dashboard'
import AdminPage     from './pages/admin/AdminPage'
import Setup         from './pages/Setup'
import Profile       from './pages/Profile'

/** Redireciona / → /dashboard (logado) ou /login (não logado) */
function RootRedirect() {
  const { currentUser } = useAuth()
  return <Navigate to={currentUser ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <ThemeProvider>
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

              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
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

            {/* Global toast notifications */}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1f2937',
                  color: '#f9fafb',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: { primary: '#0ea5e9', secondary: '#f9fafb' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#f9fafb' },
                },
              }}
            />
          </DayProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
