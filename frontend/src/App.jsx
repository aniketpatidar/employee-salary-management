import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './DashboardPage'
import { GuestRoute } from './features/auth/GuestRoute'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordResetConfirmPage } from './features/auth/PasswordResetConfirmPage'
import { PasswordResetRequestPage } from './features/auth/PasswordResetRequestPage'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { InsightsPage } from './features/insights/InsightsPage'
import { HealthCheckPage } from './HealthCheckPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HealthCheckPage />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/passwords/new"
          element={
            <GuestRoute>
              <PasswordResetRequestPage />
            </GuestRoute>
          }
        />
        <Route
          path="/passwords/:token/edit"
          element={
            <GuestRoute>
              <PasswordResetConfirmPage />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute>
              <AppLayout>
                <InsightsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
