import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logout } from '@/features/auth/api'
import { AppLayout } from './AppLayout'

vi.mock('@/features/auth/api', () => ({
  logout: vi.fn(),
}))

function renderLayout() {
  return render(
    <MemoryRouter>
      <AppLayout>
        <p>Page content</p>
      </AppLayout>
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

  it('calls the logout api when Log out is clicked', async () => {
    logout.mockResolvedValue({})
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(logout).toHaveBeenCalled()
  })
})
