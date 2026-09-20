import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { login } from './api'

vi.mock('./api', () => ({
  login: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows inline validation errors when submitted with both fields blank', () => {
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.getByText('Email address is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('shows an inline validation error only for the blank password field when email is filled in', () => {
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'hr.manager@acme.test' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.queryByText('Email address is required')).not.toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('shows a generic invalid-credentials message on failed login without naming which field was wrong', async () => {
    login.mockRejectedValue(new Error('Invalid email or password'))
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'hr.manager@acme.test' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates to the dashboard after a successful login', async () => {
    login.mockResolvedValue({ user: { email_address: 'hr.manager@acme.test' } })
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'hr.manager@acme.test' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'SalaryAdmin!2024' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }))
  })
})
