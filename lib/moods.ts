/**
 * Moods: after rating, members can tap up to two words for what a video was
 * like. They drive the mood filters, and show to others as a crowd split once
 * enough people agree. Client-safe: no server imports.
 */

export const MOODS = [
  { key: 'calming', label: 'Calming' },
  { key: 'funny', label: 'Funny' },
  { key: 'mind-blowing', label: 'Mind-blowing' },
  { key: 'moving', label: 'Moving' },
  { key: 'cosy', label: 'Cosy' },
  { key: 'intense', label: 'Intense' },
  { key: 'thought-provoking', label: 'Thought-provoking' },
  { key: 'slow-burn', label: 'Slow burn' },
] as const

export type MoodKey = (typeof MOODS)[number]['key']

export const MOOD_KEYS: string[] = MOODS.map((m) => m.key)
export const MAX_MOODS_PER_PERSON = 2
/** A mood shows, and filters, once this many people have tapped it. */
export const MOOD_MIN_AGREE = 3

export function moodLabel(key: string): string {
  return MOODS.find((m) => m.key === key)?.label || key
}

/** Valid, distinct mood keys, at most two. */
export function cleanMoods(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  for (const m of input) {
    if (typeof m === 'string' && MOOD_KEYS.includes(m) && !out.includes(m)) out.push(m)
    if (out.length === MAX_MOODS_PER_PERSON) break
  }
  return out
}

export interface MoodShare {
  mood: string
  count: number
  /** Share of the people who tapped any mood for this video, 0–1. */
  share: number
}

/**
 * The crowd's moods for one video, from each tag (one row per person per
 * mood). Only moods at least MOOD_MIN_AGREE people chose are returned,
 * strongest first.
 */
export function crowdMoods(tags: { userId: string; mood: string }[], minAgree: number = MOOD_MIN_AGREE): MoodShare[] {
  const people = new Set(tags.map((t) => t.userId)).size
  if (people === 0) return []
  const counts = new Map<string, number>()
  for (const t of tags) counts.set(t.mood, (counts.get(t.mood) || 0) + 1)
  return Array.from(counts, ([mood, count]) => ({ mood, count, share: count / people }))
    .filter((m) => m.count >= minAgree)
    .sort((a, b) => b.count - a.count || MOOD_KEYS.indexOf(a.mood) - MOOD_KEYS.indexOf(b.mood))
}

/** "Mostly calming" when one mood is most people's, else "Calming and funny". */
export function describeMoods(moods: MoodShare[]): string | null {
  if (moods.length === 0) return null
  const [top, next] = moods
  if (top.share >= 0.5 && (!next || top.count > next.count)) return `Mostly ${moodLabel(top.mood).toLowerCase()}`
  if (next) return `${moodLabel(top.mood)} and ${moodLabel(next.mood).toLowerCase()}`
  return moodLabel(top.mood)
}
