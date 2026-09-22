import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InsightsTable } from './InsightsTable'

function group(overrides = {}) {
  return {
    group: 'engineering',
    currency: 'usd',
    average: 100000,
    median: 95000,
    count: 12,
    ...overrides,
  }
}

describe('InsightsTable', () => {
  it('renders the humanized group, uppercase currency, count, and money formatted in that currency', () => {
    render(
      <InsightsTable
        groups={[group({ group: 'human_resources', currency: 'jpy', average: 6000000, median: 5500000, count: 8 })]}
      />,
    )

    expect(screen.getByText('Human Resources')).toBeInTheDocument()
    expect(screen.getByText('JPY')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('¥6,000,000')).toBeInTheDocument()
    expect(screen.getByText('¥5,500,000')).toBeInTheDocument()
  })

  it('formats a row in euros using two decimal places', () => {
    render(<InsightsTable groups={[group({ group: 'sales', currency: 'eur', average: 54999.5, median: 53000 })]} />)

    expect(screen.getByText('€54,999.50')).toBeInTheDocument()
    expect(screen.getByText('€53,000.00')).toBeInTheDocument()
  })

  it('renders one row per group', () => {
    render(
      <InsightsTable
        groups={[group({ group: 'engineering', currency: 'usd' }), group({ group: 'sales', currency: 'usd' })]}
      />,
    )

    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('shows the empty-state message when there are no groups', () => {
    render(<InsightsTable groups={[]} />)

    expect(screen.getByText('No employees match the current filters.')).toBeInTheDocument()
  })
})
