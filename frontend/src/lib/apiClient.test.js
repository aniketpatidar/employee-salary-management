import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function stubLocationAssign() {
  const assignMock = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign: assignMock },
  })
  return assignMock
}

describe('apiRequest', () => {
  let originalLocation

  beforeEach(() => {
    vi.resetModules()
    originalLocation = window.location
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('sends cookies and a JSON content-type header when a body is provided', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { apiRequest } = await import('./apiClient.js')
    await apiRequest('/session', { method: 'POST', body: { email_address: 'a@b.com', password: 'x' } })

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: 'a@b.com', password: 'x' }),
    })
  })

  it('defaults to a GET request with no body', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { email_address: 'a@b.com' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { apiRequest } = await import('./apiClient.js')
    const result = await apiRequest('/session')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/session',
      expect.objectContaining({ method: 'GET', body: undefined }),
    )
    expect(result).toEqual({ user: { email_address: 'a@b.com' } })
  })

  it('rejects with an ApiError carrying the status and backend error message on a non-ok response', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid email or password' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { apiRequest, ApiError } = await import('./apiClient.js')

    await expect(apiRequest('/session', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Invalid email or password',
      status: 401,
    })
    await expect(apiRequest('/session', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError)
  })

  it('falls back to a generic message when a non-ok response has no JSON error body', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { apiRequest } = await import('./apiClient.js')

    await expect(apiRequest('/employees')).rejects.toThrow('Request failed with status 500')
  })

  it('builds a same-origin path with no double slash when the base URL is relative', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { email_address: 'a@b.com' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { apiRequest } = await import('./apiClient.js')
    await apiRequest('/session')

    expect(fetchMock).toHaveBeenCalledWith('/api/session', expect.objectContaining({ method: 'GET' }))
  })

  it('redirects to /login when a normal request returns 401', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Session expired' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const assignMock = stubLocationAssign()

    const { apiRequest } = await import('./apiClient.js')
    await expect(apiRequest('/employees')).rejects.toMatchObject({ status: 401 })

    expect(assignMock).toHaveBeenCalledWith('/login')
  })

  it('does not redirect when the session check returns 401', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const assignMock = stubLocationAssign()

    const { apiRequest } = await import('./apiClient.js')
    await expect(apiRequest('/session')).rejects.toMatchObject({ status: 401 })

    expect(assignMock).not.toHaveBeenCalled()
  })

  it('does not redirect when a login attempt returns 401', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid email or password' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const assignMock = stubLocationAssign()

    const { apiRequest } = await import('./apiClient.js')
    await expect(
      apiRequest('/session', { method: 'POST', body: { email_address: 'a@b.com', password: 'x' } }),
    ).rejects.toMatchObject({ status: 401 })

    expect(assignMock).not.toHaveBeenCalled()
  })
})
