import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchEmployeeFilterOptions } from '../employees/api'
import { fetchPayInsights } from './api'
import { InsightsPage } from './InsightsPage'

vi.mock('./api', () => ({
  fetchPayInsights: vi.fn(),
}))

vi.mock('../employees/api', () => ({
  fetchEmployeeFilterOptions: vi.fn(),
}))

const filterOptions = {
  department: ['engineering', 'sales'],
  country: ['united_states', 'germany'],
  role: ['software_engineer', 'sales_manager'],
  employment_type: ['full_time', 'contractor'],
  status: ['active', 'inactive'],
}

async function openDropdown(user, label) {
  await user.click(screen.getByRole('combobox', { name: label }))
}

async function selectOption(user, label, optionText) {
  await openDropdown(user, label)
  await user.click(await screen.findByRole('option', { name: optionText }))
}

function insightsResponse(overrides = {}) {
  return { groups: [], ...overrides }
}

function renderPage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <InsightsPage />
    </MemoryRouter>,
  )
}

describe('InsightsPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('requests department breakdown with no filters by default', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchPayInsights.mockResolvedValue(insightsResponse())

    renderPage()

    await waitFor(() => expect(fetchPayInsights).toHaveBeenCalledWith({ breakdown: 'department' }))
  })

  it('requests insights using the breakdown and filters present in the URL', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchPayInsights.mockResolvedValue(insightsResponse())

    renderPage(['/?breakdown=country&department=sales'])

    await waitFor(() =>
      expect(fetchPayInsights).toHaveBeenCalledWith({ breakdown: 'country', department: 'sales' }),
    )
  })

  it('requests the new breakdown when the breakdown selector changes', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchPayInsights.mockResolvedValue(insightsResponse())
    const user = userEvent.setup()

    renderPage()
    await waitFor(() => expect(fetchPayInsights).toHaveBeenCalledWith({ breakdown: 'department' }))

    await selectOption(user, 'Breakdown', 'Country')

    await waitFor(() => expect(fetchPayInsights).toHaveBeenCalledWith({ breakdown: 'country' }))
  })

  it('shows the empty-state message when no employees match the current filters', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchPayInsights.mockResolvedValue(insightsResponse({ groups: [] }))

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('No employees match the current filters.')).toBeInTheDocument(),
    )
  })

  it('shows an error message when loading insights fails', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchPayInsights.mockRejectedValue(new Error('network error'))

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Unable to load pay insights right now.')).toBeInTheDocument(),
    )
  })

  it('shows a filter-options error while still rendering the insights table', async () => {
    fetchEmployeeFilterOptions.mockRejectedValue(new Error('network error'))
    fetchPayInsights.mockResolvedValue(
      insightsResponse({
        groups: [{ group: 'engineering', currency: 'usd', count: 3, average: 90000, median: 88000 }],
      }),
    )

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Unable to load filter options.')).toBeInTheDocument(),
    )
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })
})
