import { describe, it, expect } from 'vitest'
import { extractVideoId, parseWatchHistory } from '../utils/googleTakeout.js'

const VALID = 'dQw4w9WgXcQ'

describe('extractVideoId', () => {
  it('parses watch, short, embed and /v/ URLs', () => {
    expect(extractVideoId(`https://www.youtube.com/watch?v=${VALID}`)).toBe(VALID)
    expect(extractVideoId(`https://youtu.be/${VALID}`)).toBe(VALID)
    expect(extractVideoId(`https://www.youtube.com/embed/${VALID}`)).toBe(VALID)
    expect(extractVideoId(`https://www.youtube.com/v/${VALID}`)).toBe(VALID)
  })
  it('returns null for non-YouTube or empty URLs', () => {
    expect(extractVideoId('https://example.com/watch?v=abc')).toBeNull()
    expect(extractVideoId('')).toBeNull()
    expect(extractVideoId(null)).toBeNull()
  })
})

describe('parseWatchHistory', () => {
  it('normalizes valid entries and strips the "Watched " prefix', () => {
    const data = [
      {
        title: 'Watched Never Gonna Give You Up',
        titleUrl: `https://www.youtube.com/watch?v=${VALID}`,
        subtitles: [{ name: 'Rick Astley' }],
        time: '2024-01-01T00:00:00Z',
      },
    ]
    const videos = parseWatchHistory(data)
    expect(videos).toHaveLength(1)
    expect(videos[0]).toMatchObject({
      id: VALID,
      title: 'Never Gonna Give You Up',
      channel: 'Rick Astley',
      watchedAt: '2024-01-01T00:00:00Z',
    })
  })

  it('skips entries without a usable video URL or title, and defaults the channel', () => {
    const data = [
      { title: 'No url here' },
      { titleUrl: `https://www.youtube.com/watch?v=${VALID}` }, // no title
      { title: 'Watched Something', titleUrl: 'https://example.com/x' }, // not youtube
      { title: 'Watched Good One', titleUrl: `https://youtu.be/${VALID}` }, // no subtitles
    ]
    const videos = parseWatchHistory(data)
    expect(videos).toHaveLength(1)
    expect(videos[0].title).toBe('Good One')
    expect(videos[0].channel).toBe('Unknown Channel')
  })

  it('returns an empty array for non-array input', () => {
    expect(parseWatchHistory(null)).toEqual([])
    expect(parseWatchHistory({})).toEqual([])
  })
})
