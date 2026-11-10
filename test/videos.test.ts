import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/prisma', () => ({ prisma: {} }))
vi.mock('../utils/youtube', () => ({ getVideosDetails: async () => new Map() }))

import { sanitizeHints, isConnectionError } from '../lib/videos'

describe('sanitizeHints', () => {
  it('caps lengths and collapses whitespace', () => {
    const out = sanitizeHints({ title: '  A   title \n with  space ', channel: 'x'.repeat(500) })
    expect(out.title).toBe('A title with space')
    expect(out.channel).toHaveLength(120)
  })
  it('ignores non-string values', () => {
    const out = sanitizeHints({ title: { evil: true }, channel: 42, category: ['a'] })
    expect(out.title).toBe('Untitled video')
    expect(out.channel).toBe('')
    expect(out.category).toBeNull()
  })
  it('keeps only YouTube thumbnail URLs', () => {
    expect(sanitizeHints({ thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }).thumbnail).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    )
    expect(sanitizeHints({ thumbnail: 'https://evil.example/x.jpg' }).thumbnail).toBeNull()
    expect(sanitizeHints({ thumbnail: 'javascript:alert(1)' }).thumbnail).toBeNull()
  })
})

describe('isConnectionError', () => {
  it('retries only when the database is unreachable', () => {
    expect(isConnectionError({ code: 'P1001' })).toBe(true)
    expect(isConnectionError({ message: "Can't reach database server" })).toBe(true)
    expect(isConnectionError({ code: 'P2002' })).toBe(false)
    expect(isConnectionError(new Error('Invalid input'))).toBe(false)
  })
})
