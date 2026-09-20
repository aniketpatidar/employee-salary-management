import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PasswordResetRequestPage } from './PasswordResetRequestPage'
import { requestPasswordReset } from './api'

vi.mock('./api', () => ({
  requestPasswordReset: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <PasswordResetRequestPage />
    </MemoryRouter>,
  )
}

describe('PasswordResetRequestPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows an inline validation error when submitted with a blank email address', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(screen.getByText('Email address is required')).toBeInTheDocument()
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('shows the same generic confirmation message when the email matches an account', async () => {
    requestPasswordReset.mockResolvedValue({ message: 'ok' })
    renderPage()

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'hr.manager@acme.test' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() =>
      expect(
        screen.getByText('If an account with that email exists, password reset instructions have been sent.'),
      ).toBeInTheDocument(),
    )
  })

  it('shows the identical generic confirmation message even when the email does not match any account', async () => {
    requestPasswordReset.mockResolvedValue({ message: 'ok' })
    renderPage()

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'nobody@acme.test' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() =>
      expect(
        screen.getByText('If an account with that email exists, password reset instructions have been sent.'),
      ).toBeInTheDocument(),
    )
  })
})
