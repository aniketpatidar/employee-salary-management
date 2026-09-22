import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ManagerCombobox } from './ManagerCombobox'
import { fetchManagerOptions } from './api'

vi.mock('./api', () => ({
  fetchManagerOptions: vi.fn(),
}))

describe('ManagerCombobox', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('requests manager options for the typed query and the excluded id', async () => {
    fetchManagerOptions.mockResolvedValue([])
    const user = userEvent.setup()
    render(<ManagerCombobox value={null} label="" excludeId={42} onSelect={vi.fn()} onClear={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'Jan')

    await waitFor(() =>
      expect(fetchManagerOptions).toHaveBeenLastCalledWith({ q: 'Jan', excludeId: 42 }),
    )
  })

  it('selecting an option calls onSelect with that option', async () => {
    fetchManagerOptions.mockResolvedValue([
      { id: 5, full_name: 'Jane Manager', department: 'engineering', role: 'engineering_manager' },
    ])
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ManagerCombobox value={null} label="" excludeId={null} onSelect={onSelect} onClear={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'Jane')
    await user.click(await screen.findByRole('button', { name: /Jane Manager/ }))

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, full_name: 'Jane Manager' }),
    )
  })

  it('shows the selected manager label with a Clear action instead of the search input', () => {
    render(
      <ManagerCombobox value={5} label="Jane Manager" excludeId={null} onSelect={vi.fn()} onClear={vi.fn()} />,
    )

    expect(screen.getByText('Jane Manager')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('clicking Clear calls onClear', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(
      <ManagerCombobox value={5} label="Jane Manager" excludeId={null} onSelect={vi.fn()} onClear={onClear} />,
    )

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
