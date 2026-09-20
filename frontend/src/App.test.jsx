import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchHealthCheck } from './lib/apiClient'

vi.mock('./lib/apiClient', () => ({
  fetchHealthCheck: vi.fn(),
}))

describe('App', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('displays the health status returned by the API after a successful fetch', async () => {
    fetchHealthCheck.mockResolvedValue({ status: 'ok' })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/api health check: ok/i)).toBeInTheDocument())
  })

  it('displays an unreachable status when the health-check fetch fails', async () => {
    fetchHealthCheck.mockRejectedValue(new Error('network error'))

    render(<App />)

    await waitFor(() =>
      expect(screen.getByText(/api health check: unreachable/i)).toBeInTheDocument(),
    )
  })
})
