import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import { fetchCurrentSession } from './api'

vi.mock('./api', () => ({
  fetchCurrentSession: vi.fn(),
}))

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <p>Secret employee content</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects to the login page when there is no valid session', async () => {
    fetchCurrentSession.mockRejectedValue(new Error('Not authenticated'))

    renderProtectedRoute()

    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument())
    expect(screen.queryByText('Secret employee content')).not.toBeInTheDocument()
  })

  it('renders the protected content when a valid session exists', async () => {
    fetchCurrentSession.mockResolvedValue({ user: { email_address: 'hr.manager@acme.test' } })

    renderProtectedRoute()

    await waitFor(() => expect(screen.getByText('Secret employee content')).toBeInTheDocument())
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })
})
