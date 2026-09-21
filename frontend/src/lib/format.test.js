import { describe, expect, it } from 'vitest'
import { humanizeEnumValue } from './format'

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
