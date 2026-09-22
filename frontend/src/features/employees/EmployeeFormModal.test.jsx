import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmployeeFormModal } from './EmployeeFormModal'
import { ApiError } from '@/lib/apiClient'
import { createEmployee, fetchEmployee, updateEmployee } from './api'
import { EmployeeForm } from './EmployeeForm'

vi.mock('./api', () => ({
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  fetchEmployee: vi.fn(),
  fetchManagerOptions: vi.fn().mockResolvedValue([]),
}))

vi.mock('./EmployeeForm', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, EmployeeForm: vi.fn(actual.EmployeeForm) }
})

const { EmployeeForm: RealEmployeeForm } = await vi.importActual('./EmployeeForm')

const filterOptions = {
  department: ['engineering', 'sales'],
  role: ['software_engineer', 'sales_manager'],
  country: ['united_states', 'germany'],
  employment_type: ['full_time', 'contractor'],
  status: ['active', 'inactive'],
  country_currency: { united_states: 'usd', germany: 'eur' },
}

function existingEmployee(overrides = {}) {
  return {
    id: 7,
    full_name: 'Existing Person',
    department: 'sales',
    role: 'sales_manager',
    country: 'germany',
    base_salary: 60000,
    employment_type: 'contractor',
    pay_frequency: 'monthly',
    hire_date: '2021-03-01',
    manager_id: null,
    manager: null,
    ...overrides,
  }
}

describe('EmployeeFormModal', () => {
  afterEach(() => {
    vi.clearAllMocks()
    EmployeeForm.mockImplementation(RealEmployeeForm)
  })

  it('add mode submits the values from the form and calls onSaved', async () => {
    createEmployee.mockResolvedValue({ employee: { id: 42 } })
    const fakeValues = { full_name: 'New Hire', base_salary: '82000' }
    EmployeeForm.mockImplementation(({ onSubmit }) => (
      <button type="button" onClick={() => onSubmit(fakeValues)}>
        Fake Submit
      </button>
    ))
    const user = userEvent.setup()
    const onSaved = vi.fn()

    render(
      <EmployeeFormModal mode="add" filterOptions={filterOptions} onOpenChange={vi.fn()} onSaved={onSaved} />,
    )
    await user.click(screen.getByRole('button', { name: 'Fake Submit' }))

    expect(createEmployee).toHaveBeenCalledWith(fakeValues)
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('edit mode renders server-side 422 errors under the matching fields and does not call onSaved', async () => {
    fetchEmployee.mockResolvedValue({ employee: existingEmployee() })
    updateEmployee.mockRejectedValue(
      new ApiError('Unprocessable', {
        status: 422,
        data: { errors: { base_salary: ['is not a number'], full_name: ["can't be blank"] } },
      }),
    )
    const user = userEvent.setup()
    const onSaved = vi.fn()

    render(
      <EmployeeFormModal
        mode="edit"
        employeeId={7}
        filterOptions={filterOptions}
        onOpenChange={vi.fn()}
        onSaved={onSaved}
      />,
    )

    await screen.findByDisplayValue('Existing Person')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('is not a number')).toBeInTheDocument()
    expect(screen.getByText("can't be blank")).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('shows a load error and no form when fetchEmployee fails', async () => {
    fetchEmployee.mockRejectedValue(new Error('network error'))

    render(
      <EmployeeFormModal
        mode="edit"
        employeeId={7}
        filterOptions={filterOptions}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(await screen.findByText('Unable to load employee.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('shows a generic save error and keeps the modal open when a non-422 save error occurs', async () => {
    fetchEmployee.mockResolvedValue({ employee: existingEmployee() })
    updateEmployee.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <EmployeeFormModal
        mode="edit"
        employeeId={7}
        filterOptions={filterOptions}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />,
    )

    await screen.findByDisplayValue('Existing Person')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Unable to save employee right now.')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('edit mode prefills the form from fetchEmployee', async () => {
    fetchEmployee.mockResolvedValue({ employee: existingEmployee() })

    render(
      <EmployeeFormModal
        mode="edit"
        employeeId={7}
        filterOptions={filterOptions}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(await screen.findByDisplayValue('Existing Person')).toBeInTheDocument()
    expect(screen.getByDisplayValue('60000')).toBeInTheDocument()
  })

  it('edit mode submits the updated values via updateEmployee', async () => {
    fetchEmployee.mockResolvedValue({ employee: existingEmployee() })
    updateEmployee.mockResolvedValue({ employee: { id: 7 } })
    const user = userEvent.setup()
    const onSaved = vi.fn()

    render(
      <EmployeeFormModal
        mode="edit"
        employeeId={7}
        filterOptions={filterOptions}
        onOpenChange={vi.fn()}
        onSaved={onSaved}
      />,
    )

    const salaryInput = await screen.findByDisplayValue('60000')
    await user.clear(salaryInput)
    await user.type(salaryInput, '75000')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateEmployee).toHaveBeenCalledWith(7, expect.objectContaining({ base_salary: '75000' })),
    )
    expect(onSaved).toHaveBeenCalledTimes(1)
  })
})
