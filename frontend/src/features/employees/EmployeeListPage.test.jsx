import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmployeeListPage } from './EmployeeListPage'
import { fetchEmployeeFilterOptions, fetchEmployees } from './api'

async function openDropdown(user, label) {
  await user.click(screen.getByRole('combobox', { name: label }))
}

async function selectOption(user, label, optionText) {
  await openDropdown(user, label)
  await user.click(await screen.findByRole('option', { name: optionText }))
}

vi.mock('./api', () => ({
  fetchEmployees: vi.fn(),
  fetchEmployeeFilterOptions: vi.fn(),
}))

const filterOptions = {
  department: ['engineering', 'sales'],
  country: ['united_states', 'germany'],
  role: ['software_engineer', 'sales_manager'],
  employment_type: ['full_time', 'contractor'],
  status: ['active', 'inactive'],
}

function renderPage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <EmployeeListPage />
    </MemoryRouter>,
  )
}

function employeesPage(overrides = {}) {
  return {
    employees: [],
    page: 1,
    per_page: 20,
    total_count: 0,
    ...overrides,
  }
}

describe('EmployeeListPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders a row for each employee returned by the API', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(
      employeesPage({
        employees: [
          {
            id: 7,
            full_name: 'Jane Doe',
            department: 'engineering',
            role: 'software_engineer',
            country: 'united_states',
            employment_type: 'full_time',
            status: 'active',
          },
        ],
        total_count: 1,
      }),
    )

    renderPage()

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
  })

  it('shows an empty-state message when no employees match the current filters', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage())

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('No employees match the current filters.')).toBeInTheDocument(),
    )
  })

  it('requests employees filtered by the department present in the URL', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage())

    renderPage(['/?department=sales'])

    await waitFor(() =>
      expect(fetchEmployees).toHaveBeenCalledWith({ department: 'sales', page: 1 }),
    )
  })

  it('combines multiple URL filters into a single request', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage())

    renderPage(['/?department=sales&country=germany'])

    await waitFor(() =>
      expect(fetchEmployees).toHaveBeenCalledWith({
        department: 'sales',
        country: 'germany',
        page: 1,
      }),
    )
  })

  it('requests the next page when the Next button is clicked', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage({ total_count: 40 }))

    renderPage()
    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledWith({ page: 2 }))
  })

  it('requests the prior page when the Previous button is clicked', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage({ page: 2, total_count: 40 }))

    renderPage(['/?page=2'])
    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))

    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledWith({ page: 1 }))
  })

  it('disables the Previous button on the first page', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage({ total_count: 40 }))

    renderPage()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled())
  })

  it('disables the Next button on the last page', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage({ page: 2, total_count: 40 }))

    renderPage(['/?page=2'])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled())
  })

  it('lists the department options as humanized labels from the filter-options response', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage())
    const user = userEvent.setup()

    renderPage()
    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledTimes(1))
    await openDropdown(user, 'Department')

    const optionLabels = screen.getAllByRole('option').map((option) => option.textContent)
    expect(optionLabels).toEqual(['All departments', 'Engineering', 'Sales'])
  })

  it('does not offer an All option in the Status dropdown', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage())
    const user = userEvent.setup()

    renderPage()
    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledTimes(1))
    await openDropdown(user, 'Status')

    const optionLabels = screen.getAllByRole('option').map((option) => option.textContent)
    expect(optionLabels).toEqual(['Active', 'Inactive'])
  })

  it('requests the selected department and resets to page 1 when choosing a department filter', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage({ page: 3 }))
    const user = userEvent.setup()

    renderPage(['/?page=3'])
    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledWith({ page: 3 }))

    await selectOption(user, 'Department', 'Sales')

    await waitFor(() =>
      expect(fetchEmployees).toHaveBeenCalledWith({ department: 'sales', page: 1 }),
    )
  })

  it('requests inactive employees when Inactive is selected in the Status dropdown', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage())
    const user = userEvent.setup()

    renderPage()
    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledWith({ page: 1 }))

    await selectOption(user, 'Status', 'Inactive')

    await waitFor(() =>
      expect(fetchEmployees).toHaveBeenCalledWith({ status: 'inactive', page: 1 }),
    )
  })

  it('removes the department filter when All departments is selected', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockResolvedValue(employeesPage())
    const user = userEvent.setup()

    renderPage(['/?department=sales'])
    await waitFor(() =>
      expect(fetchEmployees).toHaveBeenCalledWith({ department: 'sales', page: 1 }),
    )

    await selectOption(user, 'Department', 'All departments')

    await waitFor(() => expect(fetchEmployees).toHaveBeenCalledWith({ page: 1 }))
  })

  it('shows an error message and hides pagination when fetching employees fails', async () => {
    fetchEmployeeFilterOptions.mockResolvedValue(filterOptions)
    fetchEmployees.mockRejectedValue(new Error('network error'))

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Unable to load employees right now.')).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('shows a filter-options error while still rendering the employee list', async () => {
    fetchEmployeeFilterOptions.mockRejectedValue(new Error('network error'))
    fetchEmployees.mockResolvedValue(
      employeesPage({
        employees: [
          {
            id: 9,
            full_name: 'Amir Khan',
            department: 'engineering',
            role: 'software_engineer',
            country: 'united_states',
            employment_type: 'full_time',
            status: 'active',
          },
        ],
        total_count: 1,
      }),
    )

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Unable to load filter options.')).toBeInTheDocument(),
    )
    expect(screen.getByText('Amir Khan')).toBeInTheDocument()
  })
})
