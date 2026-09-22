import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmployeeTable } from './EmployeeTable'

function employee(overrides = {}) {
  return {
    id: 1,
    full_name: 'Jane Doe',
    department: 'engineering',
    role: 'software_engineer',
    country: 'united_states',
    employment_type: 'full_time',
    status: 'active',
    ...overrides,
  }
}

describe('EmployeeTable', () => {
  it('shows a Deactivate action for an active employee', () => {
    render(
      <EmployeeTable employees={[employee()]} isLoading={false} onEdit={vi.fn()} onDeactivate={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
  })

  it('hides the Deactivate action for an inactive employee', () => {
    render(
      <EmployeeTable
        employees={[employee({ status: 'inactive' })]}
        isLoading={false}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
  })

  it('calls onEdit with the employee id when Edit is clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(
      <EmployeeTable employees={[employee({ id: 9 })]} isLoading={false} onEdit={onEdit} onDeactivate={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(onEdit).toHaveBeenCalledWith(9)
  })

  it('calls onDeactivate with the employee when Deactivate is clicked', async () => {
    const user = userEvent.setup()
    const onDeactivate = vi.fn()
    const target = employee({ id: 9 })
    render(
      <EmployeeTable employees={[target]} isLoading={false} onEdit={vi.fn()} onDeactivate={onDeactivate} />,
    )

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(onDeactivate).toHaveBeenCalledWith(target)
  })
})
