import { describe, expect, it } from 'vitest'
import { formatMoney, humanizeEnumValue } from './format'

describe('humanizeEnumValue', () => {
  it('capitalizes each underscore-separated word', () => {
    expect(humanizeEnumValue('human_resources')).toBe('Human Resources')
  })

  it('capitalizes a single word with no underscores', () => {
    expect(humanizeEnumValue('engineering')).toBe('Engineering')
  })

  it('returns an empty string for an empty value', () => {
    expect(humanizeEnumValue('')).toBe('')
  })

  it('returns an empty string for a nullish value', () => {
    expect(humanizeEnumValue(null)).toBe('')
    expect(humanizeEnumValue(undefined)).toBe('')
  })
})

describe('formatMoney', () => {
  it('formats USD with two decimal places', () => {
    expect(formatMoney(95000, 'usd')).toBe('$95,000.00')
  })

  it('formats JPY with no decimal places', () => {
    expect(formatMoney(4500000, 'jpy')).toBe('¥4,500,000')
  })

  it('formats INR with two decimal places', () => {
    expect(formatMoney(1250000.5, 'inr')).toBe('₹1,250,000.50')
  })

  it('uppercases a lowercase currency code before formatting', () => {
    expect(formatMoney(100, 'usd')).toBe(formatMoney(100, 'USD'))
  })

  it('returns the raw amount as a string when no currency code is given', () => {
    expect(formatMoney(500, undefined)).toBe('500')
  })
})
