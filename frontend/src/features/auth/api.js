import { apiRequest } from '../../lib/apiClient'

export function fetchCurrentSession() {
  return apiRequest('/session')
}

export function login({ emailAddress, password }) {
  return apiRequest('/session', {
    method: 'POST',
    body: { email_address: emailAddress, password },
  })
}

export function logout() {
  return apiRequest('/session', { method: 'DELETE' })
}

export function requestPasswordReset({ emailAddress }) {
  return apiRequest('/passwords', {
    method: 'POST',
    body: { email_address: emailAddress },
  })
}

export function confirmPasswordReset({ token, password, passwordConfirmation }) {
  return apiRequest(`/passwords/${token}`, {
    method: 'PATCH',
    body: { password, password_confirmation: passwordConfirmation },
  })
}
