import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logout } from '@/features/auth/api'
import { AppLayout } from './AppLayout'

vi.mock('@/features/auth/api', () => ({
  logout: vi.fn(),
}))

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <p>Page content</p>
            </AppLayout>
          }
        />
        <Route path="/login" element={<p>Login Page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders a nav link to the Employees page', () => {
    renderLayout()

    expect(screen.getByRole('link', { name: 'Employees' })).toHaveAttribute('href', '/dashboard')
  })

  it('renders a nav link to the Pay Insights page', () => {
    renderLayout()

    expect(screen.getByRole('link', { name: 'Pay Insights' })).toHaveAttribute('href', '/insights')
  })

  it('navigates to the login route after logging out', async () => {
    logout.mockResolvedValue({})
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(logout).toHaveBeenCalled()
    expect(await screen.findByText('Login Page')).toBeInTheDocument()
  })
})
