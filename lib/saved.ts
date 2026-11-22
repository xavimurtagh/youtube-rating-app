/**
 * Saved: watch later, from anywhere. Pure helpers shared by the page and the
 * tests: length bands, filtering, and "Got 20 minutes?". Client-safe.
 */

export const LENGTHS = [
  { key: 'under-10', label: 'Under 10 min', min: 0, max: 10 * 60 },
  { key: '10-20', label: '10–20 min', min: 10 * 60, max: 20 * 60 },
  { key: '20-45', label: '20–45 min', min: 20 * 60, max: 45 * 60 },
  { key: '45-plus', label: '45 min and over', min: 45 * 60, max: Infinity },
] as const

export type LengthKey = (typeof LENGTHS)[number]['key']

export const SAVED_SOURCES = ['watch', 'card', 'link', 'share', 'poll', 'search'] as const
export const MAX_SAVED = 1000

export interface SavedItem {
  id: string
  title: string
  channel: string
  seconds: number | null
  savedAt: string
  /** Moods the crowd agrees on, strongest first. */
  moods: { mood: string; share: number }[]
  /** Members' ratings, smoothed (never shown as a number); null when unknown or sealed. */
  likely: number | null
  friends: string[]
}

/** In a length band; videos of unknown length are in none of them. */
export function inLength(seconds: number | null, key: LengthKey | null): boolean {
  if (!key) return true
  const band = LENGTHS.find((l) => l.key === key)
  if (!band || seconds == null) return false
  return seconds >= band.min && seconds < band.max
}

export function filterSaved<T extends SavedItem>(items: T[], { length = null, mood = null }: { length?: LengthKey | null; mood?: string | null }): T[] {
  return items.filter((v) => inLength(v.seconds, length) && (!mood || v.moods.some((m) => m.mood === mood)))
}

export type SavedOrder = 'recent' | 'shortest' | 'longest' | 'loved'

export function sortSaved<T extends SavedItem>(items: T[], order: SavedOrder): T[] {
  const list = [...items]
  const len = (v: T, missing: number) => (v.seconds == null ? missing : v.seconds)
  if (order === 'shortest') list.sort((a, b) => len(a, Infinity) - len(b, Infinity))
  else if (order === 'longest') list.sort((a, b) => len(b, -1) - len(a, -1))
  else if (order === 'loved') list.sort((a, b) => (b.likely ?? -1) - (a.likely ?? -1) || b.savedAt.localeCompare(a.savedAt))
  else list.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  return list
}

/**
 * "Got 20 minutes?": the best video that fits. Best means most loved by
 * members here, then the one that fills more of the time, then the one that
 * has waited longest. Returns null when nothing fits.
 */
export function bestFit<T extends SavedItem>(items: T[], minutes: number): T | null {
  const limit = minutes * 60
  const fits = items.filter((v) => v.seconds != null && v.seconds <= limit)
  if (fits.length === 0) return null
  return fits.sort(
    (a, b) =>
      (b.likely ?? 0) - (a.likely ?? 0) ||
      (b.seconds as number) - (a.seconds as number) ||
      a.savedAt.localeCompare(b.savedAt)
  )[0]
}

/** Members' smoothed score, used only to order things: pulled towards 7 until a few people agree. */
export function likelyScore(avg: number | null, count: number, prior = 7, weight = 3): number | null {
  if (!count || avg == null) return null
  return Math.round(((prior * weight + avg * count) / (weight + count)) * 10) / 10
}
