import { describe, it, expect } from 'vitest'
import { parseScore } from '../lib/validation'

describe('parseScore', () => {
  it('accepts integers 1–10', () => {
    expect(parseScore(1)).toBe(1)
    expect(parseScore(5)).toBe(5)
    expect(parseScore(10)).toBe(10)
  })
  it('accepts numeric strings', () => {
    expect(parseScore('7')).toBe(7)
  })
  it('rounds fractional values', () => {
    expect(parseScore(8.4)).toBe(8)
    expect(parseScore(8.6)).toBe(9)
    expect(parseScore('9.2')).toBe(9)
  })
  it('rejects out-of-range values', () => {
    expect(parseScore(0)).toBeNull()
    expect(parseScore(11)).toBeNull()
    expect(parseScore(-3)).toBeNull()
    expect(parseScore(1000)).toBeNull()
  })
  it('rejects non-numbers and empties', () => {
    expect(parseScore('abc')).toBeNull()
    expect(parseScore(null)).toBeNull()
    expect(parseScore(undefined)).toBeNull()
    expect(parseScore('')).toBeNull()
    expect(parseScore(true)).toBeNull()
    expect(parseScore(NaN)).toBeNull()
  })
})
