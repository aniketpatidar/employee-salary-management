import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchCurrentSession } from './features/auth/api'

vi.mock('./features/auth/api', () => ({
  fetchCurrentSession: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('./features/employees/api', () => ({
  fetchEmployees: vi.fn().mockResolvedValue({ employees: [], page: 1, per_page: 25, total_count: 0 }),
  fetchEmployeeFilterOptions: vi.fn().mockResolvedValue({}),
}))

function renderAt(path) {
  window.history.pushState({}, '', path)
  render(<App />)
}

describe('App', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sends signed-out visitors of the root path to the login page', async () => {
    fetchCurrentSession.mockRejectedValue(new Error('Not authenticated'))

    renderAt('/')

    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('sends signed-in visitors of the root path to the employee list', async () => {
    fetchCurrentSession.mockResolvedValue({ user: { email_address: 'hr.manager@acme.test' } })

    renderAt('/')

    expect(await screen.findByRole('link', { name: 'Employees' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/dashboard')
  })

  it('sends unknown paths to the employee list', async () => {
    fetchCurrentSession.mockResolvedValue({ user: { email_address: 'hr.manager@acme.test' } })

    renderAt('/no-such-page')

    expect(await screen.findByRole('link', { name: 'Employees' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/dashboard')
  })
})
