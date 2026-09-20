import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordResetConfirmPage } from './features/auth/PasswordResetConfirmPage'
import { PasswordResetRequestPage } from './features/auth/PasswordResetRequestPage'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { HealthCheckPage } from './HealthCheckPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HealthCheckPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/passwords/new" element={<PasswordResetRequestPage />} />
        <Route path="/passwords/:token/edit" element={<PasswordResetConfirmPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
