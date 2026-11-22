import { describe, it, expect } from 'vitest'
import { cleanMoods, crowdMoods, describeMoods, moodLabel, MOOD_MIN_AGREE } from '../lib/moods'

describe('cleanMoods', () => {
  it('keeps known moods, without repeats, at most two', () => {
    expect(cleanMoods(['calming', 'calming', 'nonsense', 'funny', 'moving'])).toEqual(['calming', 'funny'])
  })
  it('rejects anything that is not a list of strings', () => {
    expect(cleanMoods('calming')).toEqual([])
    expect(cleanMoods([{ mood: 'calming' }, 3])).toEqual([])
  })
})

describe('crowdMoods', () => {
  const tag = (userId: string, mood: string) => ({ userId, mood })

  it('shows a mood only once three people agree', () => {
    expect(MOOD_MIN_AGREE).toBe(3)
    expect(crowdMoods([tag('a', 'calming'), tag('b', 'calming')])).toEqual([])
    const shown = crowdMoods([tag('a', 'calming'), tag('b', 'calming'), tag('c', 'calming')])
    expect(shown).toEqual([{ mood: 'calming', count: 3, share: 1 }])
  })

  it('works out shares from the people who tagged, strongest first', () => {
    const tags = [
      tag('a', 'calming'), tag('a', 'cosy'),
      tag('b', 'calming'), tag('b', 'cosy'),
      tag('c', 'calming'),
      tag('d', 'cosy'),
      tag('e', 'funny'),
    ]
    const shown = crowdMoods(tags)
    expect(shown.map((m) => m.mood)).toEqual(['calming', 'cosy'])
    expect(shown[0].share).toBeCloseTo(3 / 5)
  })
})

describe('describeMoods', () => {
  it('says "Mostly" when one mood is most people’s', () => {
    expect(describeMoods([{ mood: 'calming', count: 7, share: 0.64 }])).toBe('Mostly calming')
  })
  it('names two moods when it is closer', () => {
    expect(
      describeMoods([
        { mood: 'funny', count: 4, share: 0.4 },
        { mood: 'thought-provoking', count: 3, share: 0.3 },
      ])
    ).toBe('Funny and thought-provoking')
  })
  it('says nothing with no moods', () => {
    expect(describeMoods([])).toBeNull()
  })
  it('labels moods in sentence case', () => {
    expect(moodLabel('slow-burn')).toBe('Slow burn')
  })
})
