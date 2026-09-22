const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const SESSION_PATH = '/session'

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function buildQueryString(params) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  return query.toString()
}

function isSessionCheckOrLogin(path, method) {
  return path === SESSION_PATH && (method === 'GET' || method === 'POST')
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => null)

  if (response.status === 401 && !isSessionCheckOrLogin(path, method)) {
    window.location.assign('/login')
  }

  if (!response.ok) {
    throw new ApiError(data?.error ?? `Request failed with status ${response.status}`, {
      status: response.status,
      data,
    })
  }

  return data
}
