import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GuestRoute } from './GuestRoute'
import { fetchCurrentSession } from './api'

vi.mock('./api', () => ({
  fetchCurrentSession: vi.fn(),
}))

function renderGuestRoute() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <p>Login form</p>
            </GuestRoute>
          }
        />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GuestRoute', () => {
  it('redirects to the dashboard when a valid session exists', async () => {
    fetchCurrentSession.mockResolvedValue({ user: { email_address: 'hr.manager@acme.test' } })

    renderGuestRoute()

    await waitFor(() => expect(screen.getByText('Dashboard page')).toBeInTheDocument())
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('renders the guest content when there is no valid session', async () => {
    fetchCurrentSession.mockRejectedValue(new Error('Not authenticated'))

    renderGuestRoute()

    await waitFor(() => expect(screen.getByText('Login form')).toBeInTheDocument())
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument()
  })
})
