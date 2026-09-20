import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../lib/apiClient'
import {
  confirmPasswordReset,
  fetchCurrentSession,
  login,
  logout,
  requestPasswordReset,
} from './api'

vi.mock('../../lib/apiClient', () => ({
  apiRequest: vi.fn(),
}))

describe('auth api', () => {
  it('fetches the current session from GET /session', () => {
    fetchCurrentSession()

    expect(apiRequest).toHaveBeenCalledWith('/session')
  })

  it('logs in by posting email and password to /session', () => {
    login({ emailAddress: 'hr.manager@acme.test', password: 'SalaryAdmin!2024' })

    expect(apiRequest).toHaveBeenCalledWith('/session', {
      method: 'POST',
      body: { email_address: 'hr.manager@acme.test', password: 'SalaryAdmin!2024' },
    })
  })

  it('logs out by sending DELETE to /session', () => {
    logout()

    expect(apiRequest).toHaveBeenCalledWith('/session', { method: 'DELETE' })
  })

  it('requests a password reset by posting email to /passwords', () => {
    requestPasswordReset({ emailAddress: 'hr.manager@acme.test' })

    expect(apiRequest).toHaveBeenCalledWith('/passwords', {
      method: 'POST',
      body: { email_address: 'hr.manager@acme.test' },
    })
  })

  it('confirms a password reset by patching the token-scoped passwords endpoint', () => {
    confirmPasswordReset({ token: 'abc123', password: 'NewPassword!1', passwordConfirmation: 'NewPassword!1' })

    expect(apiRequest).toHaveBeenCalledWith('/passwords/abc123', {
      method: 'PATCH',
      body: { password: 'NewPassword!1', password_confirmation: 'NewPassword!1' },
    })
  })
})
