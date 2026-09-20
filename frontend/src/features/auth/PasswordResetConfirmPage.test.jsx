import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/apiClient'
import { PasswordResetConfirmPage } from './PasswordResetConfirmPage'
import { confirmPasswordReset } from './api'

vi.mock('./api', () => ({
  confirmPasswordReset: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderPage(token = 'valid-token') {
  return render(
    <MemoryRouter initialEntries={[`/passwords/${token}/edit`]}>
      <Routes>
        <Route path="/passwords/:token/edit" element={<PasswordResetConfirmPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillAndSubmit({ password, passwordConfirmation }) {
  if (password !== undefined) {
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: password } })
  }
  if (passwordConfirmation !== undefined) {
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: passwordConfirmation } })
  }
  fireEvent.click(screen.getByRole('button', { name: /set new password/i }))
}

describe('PasswordResetConfirmPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows inline validation errors when both password fields are left blank', () => {
    renderPage()

    fillAndSubmit({ password: '', passwordConfirmation: '' })

    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByText('Password confirmation is required')).toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('sets the new password and redirects to login on success', async () => {
    confirmPasswordReset.mockResolvedValue({ message: 'Password has been reset.' })
    renderPage('valid-token')

    fillAndSubmit({ password: 'NewPassword!1', passwordConfirmation: 'NewPassword!1' })

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }))
    expect(confirmPasswordReset).toHaveBeenCalledWith({
      token: 'valid-token',
      password: 'NewPassword!1',
      passwordConfirmation: 'NewPassword!1',
    })
  })

  it('shows an expired/invalid link error instead of redirecting when the backend returns 404', async () => {
    confirmPasswordReset.mockRejectedValue(new ApiError('Password reset link is invalid or has expired.', { status: 404 }))
    renderPage('expired-token')

    fillAndSubmit({ password: 'NewPassword!1', passwordConfirmation: 'NewPassword!1' })

    await waitFor(() =>
      expect(screen.getByText('This password reset link is invalid or has expired.')).toBeInTheDocument(),
    )
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('maps backend field errors (e.g. mismatched confirmation) onto the matching input', async () => {
    confirmPasswordReset.mockRejectedValue(
      new ApiError('Validation failed', {
        status: 422,
        data: { errors: { password_confirmation: ["doesn't match Password"] } },
      }),
    )
    renderPage('valid-token')

    fillAndSubmit({ password: 'NewPassword!1', passwordConfirmation: 'Mismatched!1' })

    await waitFor(() => expect(screen.getByText("doesn't match Password")).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
