import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('fetchHealthCheck', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('requests the health-check endpoint at the configured API base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchHealthCheck } = await import('./apiClient.js')
    await fetchHealthCheck()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('builds the request URL from a different configured base URL, proving it is not hardcoded', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://staging.example.com')
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchHealthCheck } = await import('./apiClient.js')
    await fetchHealthCheck()

    const requestedUrl = fetchMock.mock.calls[0][0]
    expect(requestedUrl).toBe('https://staging.example.com/health')
    expect(requestedUrl).not.toContain('localhost')
  })

  it('resolves with the parsed JSON body on a successful response', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', service: 'employee-salary-management-api' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchHealthCheck } = await import('./apiClient.js')
    const result = await fetchHealthCheck()

    expect(result).toEqual({ status: 'ok', service: 'employee-salary-management-api' })
  })

  it('throws an error when the response is not ok', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchHealthCheck } = await import('./apiClient.js')

    await expect(fetchHealthCheck()).rejects.toThrow('Health check failed with status 503')
  })
})

describe('apiRequest', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
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
})
