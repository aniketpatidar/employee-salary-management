import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmployeeForm, validateEmployeeForm } from './EmployeeForm'

vi.mock('./api', () => ({
  fetchManagerOptions: vi.fn().mockResolvedValue([]),
}))

const filterOptions = {
  department: ['engineering', 'sales'],
  role: ['software_engineer', 'sales_manager'],
  country: ['united_states', 'germany'],
  employment_type: ['full_time', 'contractor'],
  status: ['active', 'inactive'],
  country_currency: { united_states: 'usd', germany: 'eur' },
}

function validValues(overrides = {}) {
  return {
    full_name: 'Jane Doe',
    department: 'engineering',
    role: 'software_engineer',
    country: 'united_states',
    base_salary: '80000',
    employment_type: 'full_time',
    pay_frequency: 'annual',
    hire_date: '2022-01-15',
    ...overrides,
  }
}

function selectOption(label, optionText) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  fireEvent.click(screen.getByRole('option', { name: optionText }))
}

function currencyInput() {
  return screen.getByLabelText('Currency')
}

describe('validateEmployeeForm', () => {
  it('returns no errors for a fully valid set of values', () => {
    expect(validateEmployeeForm(validValues())).toEqual({})
  })

  it.each(['full_name', 'department', 'role', 'country', 'employment_type', 'pay_frequency', 'hire_date'])(
    'flags %s as required when blank',
    (field) => {
      const errors = validateEmployeeForm(validValues({ [field]: '' }))
      expect(errors[field]).toBeTruthy()
    },
  )

  it('flags base_salary of zero as invalid', () => {
    const errors = validateEmployeeForm(validValues({ base_salary: '0' }))
    expect(errors.base_salary).toBe('Base salary must be greater than 0')
  })

  it('flags a negative base_salary as invalid', () => {
    const errors = validateEmployeeForm(validValues({ base_salary: '-500' }))
    expect(errors.base_salary).toBe('Base salary must be greater than 0')
  })

  it('flags a non-numeric base_salary as invalid', () => {
    const errors = validateEmployeeForm(validValues({ base_salary: 'abc' }))
    expect(errors.base_salary).toBe('Base salary must be a valid number')
  })

  it('flags a future hire_date as invalid', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const errors = validateEmployeeForm(validValues({ hire_date: tomorrow }))
    expect(errors.hire_date).toBe("Hire date can't be in the future")
  })
})

describe('EmployeeForm', () => {
  it('does not render an editable ID field', () => {
    render(<EmployeeForm filterOptions={filterOptions} onSubmit={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.queryByLabelText(/^id$/i)).not.toBeInTheDocument()
  })

  it('shows currency as read-only and blank until a country is chosen', () => {
    render(<EmployeeForm filterOptions={filterOptions} onSubmit={vi.fn()} onCancel={vi.fn()} />)

    expect(currencyInput()).toHaveValue('')
    expect(currencyInput()).toHaveAttribute('readonly')
  })

  it('derives the read-only currency field from the selected country', () => {
    render(<EmployeeForm filterOptions={filterOptions} onSubmit={vi.fn()} onCancel={vi.fn()} />)

    selectOption('Country', 'Germany')

    expect(currencyInput()).toHaveValue('EUR')
  })

  it('shows inline errors for required fields left blank on submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<EmployeeForm filterOptions={filterOptions} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText("Full name can't be blank")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with the entered values when the form is valid', () => {
    const onSubmit = vi.fn()
    render(<EmployeeForm filterOptions={filterOptions} onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New Hire' } })
    selectOption('Department', 'Engineering')
    selectOption('Role', 'Software Engineer')
    selectOption('Country', 'United States')
    fireEvent.change(screen.getByLabelText('Base Salary'), { target: { value: '82000' } })
    selectOption('Employment Type', 'Full Time')
    selectOption('Pay Frequency', 'Annual')
    fireEvent.change(screen.getByLabelText('Hire Date'), { target: { value: '2023-05-01' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'New Hire',
        department: 'engineering',
        role: 'software_engineer',
        country: 'united_states',
        base_salary: '82000',
        employment_type: 'full_time',
        pay_frequency: 'annual',
        hire_date: '2023-05-01',
      }),
    )
  }, 15000)

  it('renders server-supplied errors under the matching field', () => {
    render(
      <EmployeeForm
        filterOptions={filterOptions}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        serverErrors={{ manager_id: ['must be an active employee'] }}
      />,
    )

    expect(screen.getByText('must be an active employee')).toBeInTheDocument()
  })
})
