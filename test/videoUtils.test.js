import { describe, it, expect } from 'vitest'
import { cleanVideoId, getYouTubeUrl, directVideoId } from '../utils/videoUtils.js'

const VALID = 'dQw4w9WgXcQ'

describe('cleanVideoId', () => {
  it('passes through a bare valid id', () => {
    expect(cleanVideoId(VALID)).toBe(VALID)
  })
  it('extracts from a full watch URL', () => {
    expect(cleanVideoId(`https://www.youtube.com/watch?v=${VALID}`)).toBe(VALID)
  })
  it('extracts from a watch URL with extra params', () => {
    expect(cleanVideoId(`https://www.youtube.com/watch?v=${VALID}&t=30s&list=abc`)).toBe(VALID)
  })
  it('extracts from a youtu.be short URL', () => {
    expect(cleanVideoId(`https://youtu.be/${VALID}`)).toBe(VALID)
  })
  it('extracts from an embed URL', () => {
    expect(cleanVideoId(`https://www.youtube.com/embed/${VALID}`)).toBe(VALID)
  })
  it('takes the first id from a comma-joined value', () => {
    expect(cleanVideoId(`${VALID},someOtherId`)).toBe(VALID)
  })
  it('returns null for invalid or empty input', () => {
    expect(cleanVideoId('abc')).toBeNull()
    expect(cleanVideoId('')).toBeNull()
    expect(cleanVideoId(null)).toBeNull()
    expect(cleanVideoId(undefined)).toBeNull()
    expect(cleanVideoId('toolongtobeanid12345')).toBeNull()
  })
})

describe('getYouTubeUrl', () => {
  it('builds a canonical watch URL', () => {
    expect(getYouTubeUrl(`https://youtu.be/${VALID}`)).toBe(`https://www.youtube.com/watch?v=${VALID}`)
  })
  it('returns null for invalid input', () => {
    expect(getYouTubeUrl('nope')).toBeNull()
  })
})

describe('directVideoId', () => {
  it('accepts only already-valid ids', () => {
    expect(directVideoId(VALID)).toBe(VALID)
    expect(directVideoId('short')).toBeNull()
    expect(directVideoId(12345)).toBeNull()
  })
})
