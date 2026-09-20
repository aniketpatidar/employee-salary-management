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
