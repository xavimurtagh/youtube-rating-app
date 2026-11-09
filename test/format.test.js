import { describe, it, expect } from 'vitest'
import { describeReason, withArticle, formatDuration, spelled, plural, stillUrls } from '../lib/format.js'

describe('withArticle', () => {
  it('uses "an" for numbers read with a leading vowel sound', () => {
    expect(withArticle(8)).toBe('an 8')
    expect(withArticle(8.4)).toBe('an 8.4')
    expect(withArticle(82)).toBe('an 82')
    expect(withArticle(11)).toBe('an 11')
    expect(withArticle(18)).toBe('an 18')
  })
  it('uses "a" otherwise', () => {
    expect(withArticle(9)).toBe('a 9')
    expect(withArticle(7.5)).toBe('a 7.5')
    expect(withArticle(91)).toBe('a 91')
  })
})

describe('describeReason', () => {
  it('names the most influential similar user', () => {
    const s = describeReason({
      because: { kind: 'neighbour', name: 'Sam', similarity: 82, rating: 9 },
      recommenderCount: 3,
      avgRating: 8.7,
    })
    expect(s).toBe('Sam, your 82% taste match, gave it a 9. Two others like you rated it highly too.')
  })
  it('keeps to one sentence in the short form', () => {
    const s = describeReason(
      { because: { kind: 'neighbour', name: 'Sam', similarity: 82, rating: 9 }, recommenderCount: 3 },
      { short: true }
    )
    expect(s).toBe('Sam, your 82% taste match, gave it a 9.')
  })
  it('omits the "others" clause when only one person recommended it', () => {
    const s = describeReason({ because: { kind: 'neighbour', name: 'Ana', similarity: 64, rating: 10 }, recommenderCount: 1 })
    expect(s).toBe('Ana, your 64% taste match, gave it a 10.')
  })
  it('explains category, channel and community picks without repeating the score', () => {
    expect(describeReason({ because: { kind: 'category', category: 'Education' }, avgRating: 8.9 })).toBe(
      'You rate Education videos highly.'
    )
    expect(describeReason({ because: { kind: 'channel', channel: 'Kurzgesagt' }, avgRating: 9.1 })).toBe(
      'You rate Kurzgesagt highly.'
    )
    expect(describeReason({ source: 'popular', avgRating: 9.3, recommenderCount: 14 })).toBe(
      'A favourite with people here.'
    )
  })
  it('falls back to the server reason', () => {
    expect(describeReason({ reason: 'Plain text' })).toBe('Plain text')
    expect(describeReason(null)).toBe('')
  })
})

describe('formatDuration', () => {
  it('formats ISO 8601 durations', () => {
    expect(formatDuration('PT8M31S')).toBe('8:31')
    expect(formatDuration('PT1H2M3S')).toBe('1:02:03')
    expect(formatDuration('PT45S')).toBe('0:45')
    expect(formatDuration(null)).toBeNull()
  })
})

describe('spelled / plural', () => {
  it('spells small numbers and capitalises on request', () => {
    expect(spelled(12)).toBe('twelve')
    expect(spelled(3, { capital: true })).toBe('Three')
    expect(spelled(42)).toBe('42')
  })
  it('pluralises', () => {
    expect(plural(1, 'rating')).toBe('1 rating')
    expect(plural(5, 'watch', 'watches')).toBe('5 watches')
  })
})

describe('stillUrls', () => {
  it('tries the best size first and falls back', () => {
    expect(stillUrls('dQw4w9WgXcQ', 'lg')[0]).toContain('/maxresdefault.jpg')
    expect(stillUrls('dQw4w9WgXcQ', 'lg').at(-1)).toContain('/hqdefault.jpg')
    expect(stillUrls('dQw4w9WgXcQ', 'sm')[0]).toContain('/mqdefault.jpg')
  })
})
