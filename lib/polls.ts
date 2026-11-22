/**
 * Members' polls: the year's best, chosen in three phases.
 *
 *   Nominations  members put forward up to three videos per category, by
 *                pasting a link or from their own 8s and above. A video needs
 *                two nominations to reach the ballot.
 *   Voting       members rate the nominees from 1 to 10. A vote is an ordinary
 *                rating, so one given earlier counts too. Scores stay sealed.
 *   Results      ranked by a Bayesian average of counted ratings.
 *
 * This file is client-safe (no database). Polls are defined here and copied
 * into the database on first use (lib/pollStore.ts); the phase always comes
 * from the dates.
 */

import { durationSeconds } from './format'

export interface PollCategoryConfig {
  slug: string
  title: string
  blurb: string
  /** Longest a video may be, in seconds, inclusive. */
  maxSeconds?: number | null
  minSeconds?: number | null
}

export interface PollConfig {
  slug: string
  title: string
  year: number
  /** From here the poll appears in the masthead, before nominations open. */
  announceAt: string
  opensAt: string
  votingAt: string
  closesAt: string
  publishedAt: string
  /** Videos published on YouTube in [eligibleFrom, eligibleUntil) can be nominated. */
  eligibleFrom?: string | null
  eligibleUntil?: string | null
  categories: PollCategoryConfig[]
}

// Times are midnight UTC, which is midnight in the UK in winter.
export const POLLS: PollConfig[] = [
  {
    slug: '2026',
    title: 'The best of YouTube in 2026',
    year: 2026,
    announceAt: '2026-11-15T00:00:00Z',
    opensAt: '2026-12-01T00:00:00Z',
    votingAt: '2026-12-15T00:00:00Z',
    closesAt: '2027-01-01T00:00:00Z',
    publishedAt: '2027-01-15T12:00:00Z',
    eligibleFrom: '2026-01-01T00:00:00Z',
    eligibleUntil: '2027-01-01T00:00:00Z',
    categories: [
      { slug: 'video-essay', title: 'Video essay', blurb: 'An argument you couldn’t stop thinking about.' },
      { slug: 'live-performance', title: 'Live performance', blurb: 'Sessions, sets and concerts that felt like being in the room.' },
      { slug: 'explainer', title: 'Explainer', blurb: 'Science, maths and technology, made clear at last.' },
      { slug: 'documentary', title: 'Documentary and long-form', blurb: 'Deep dives worth every minute, however many there are.' },
      { slug: 'short', title: 'Short', blurb: 'Under ten minutes, and not a second wasted.', maxSeconds: 599 },
    ],
  },
]

export const POLL_RULES = {
  nominationsPerCategory: 3,
  nominationsToBallot: 2,
  /** Accounts count once they're this old (at the close of the phase)… */
  minAccountDays: 7,
  /** …and have rated at least this many videos. */
  minRatings: 10,
  /** Bayesian prior weight: each result is pulled towards the poll's mean by this many ratings. */
  priorWeight: 5,
  /** Counted ratings a nominee needs to be ranked. */
  minCountedRatings: 5,
  runnersUp: 4,
}

export type PollPhase = 'upcoming' | 'nominations' | 'voting' | 'counting' | 'results'

type Dated = { opensAt: string | Date; votingAt: string | Date; closesAt: string | Date; publishedAt: string | Date }

const t = (d: string | Date) => new Date(d).getTime()

export function phaseOf(poll: Dated, now: Date = new Date()): PollPhase {
  const n = now.getTime()
  if (n < t(poll.opensAt)) return 'upcoming'
  if (n < t(poll.votingAt)) return 'nominations'
  if (n < t(poll.closesAt)) return 'voting'
  if (n < t(poll.publishedAt)) return 'counting'
  return 'results'
}

export function pollConfig(slug: string): PollConfig | null {
  return POLLS.find((p) => p.slug === slug) || null
}

/** The poll the masthead shows: from its announcement until six weeks after the results. */
export function currentPoll(now: Date = new Date()): PollConfig | null {
  const n = now.getTime()
  return POLLS.find((p) => n >= t(p.announceAt) && n < t(p.publishedAt) + 42 * 864e5) || null
}

/** "1 December", in UK time, which is how the dates are announced. */
export function pollDay(date: string | Date, { lastDay = false } = {}): string {
  const d = new Date(t(date) - (lastDay ? 1 : 0))
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Europe/London' })
}

/** Whether an account counts at a moment: old enough, and with enough ratings. */
export function qualifiesAt(user: { createdAt: string | Date; ratingCount: number }, at: string | Date): boolean {
  return t(user.createdAt) <= t(at) - POLL_RULES.minAccountDays * 864e5 && user.ratingCount >= POLL_RULES.minRatings
}

export interface Eligibility {
  ok: boolean
  reason?: 'year' | 'length' | 'unknown'
  message?: string
}

/** Whether a video may be nominated in a category, from its stored details. */
export function checkEligibility(
  poll: { year: number; eligibleFrom?: string | Date | null; eligibleUntil?: string | Date | null },
  category: Pick<PollCategoryConfig, 'maxSeconds' | 'minSeconds' | 'title'>,
  video: { publishedAt?: string | Date | null; duration?: string | null }
): Eligibility {
  if (poll.eligibleFrom || poll.eligibleUntil) {
    if (!video.publishedAt) return { ok: false, reason: 'unknown', message: 'We couldn’t check when that was published. Try again in a minute.' }
    const at = t(video.publishedAt)
    if ((poll.eligibleFrom && at < t(poll.eligibleFrom)) || (poll.eligibleUntil && at >= t(poll.eligibleUntil))) {
      return { ok: false, reason: 'year', message: `Only videos published in ${poll.year} can be nominated.` }
    }
  }
  if (category.maxSeconds != null || category.minSeconds != null) {
    const seconds = durationSeconds(video.duration || null)
    if (seconds == null) return { ok: false, reason: 'unknown', message: 'We couldn’t check how long that is. Try again in a minute.' }
    if (category.maxSeconds != null && seconds > category.maxSeconds) {
      return { ok: false, reason: 'length', message: `That’s too long for ${category.title}: it has to be under ${Math.round((category.maxSeconds + 1) / 60)} minutes.` }
    }
    if (category.minSeconds != null && seconds < category.minSeconds) {
      return { ok: false, reason: 'length', message: `That’s too short for ${category.title}.` }
    }
  }
  return { ok: true }
}

export interface BallotCandidate {
  id: string
  categoryId: string
  videoId: string
  removed: boolean
  /** Nominations from accounts that count. */
  counted: number
}

/**
 * Which entries make the ballot: those with enough counted nominations, with
 * each video in one category only, the one where most people nominated it
 * (ties go to the earlier category). Returns the chosen entry ids.
 */
export function buildBallot(entries: BallotCandidate[], categoryOrder: string[], threshold: number = POLL_RULES.nominationsToBallot): Set<string> {
  const order = new Map(categoryOrder.map((id, i) => [id, i]))
  const place = (e: BallotCandidate) => order.get(e.categoryId) ?? Number.MAX_SAFE_INTEGER
  const best = new Map<string, BallotCandidate>()
  for (const e of entries) {
    if (e.removed || e.counted < threshold) continue
    const current = best.get(e.videoId)
    if (!current || e.counted > current.counted || (e.counted === current.counted && place(e) < place(current))) {
      best.set(e.videoId, e)
    }
  }
  return new Set(Array.from(best.values(), (e) => e.id))
}

export interface RankedEntry {
  videoId: string
  rank: number | null
  score: number
  average: number
  count: number
}

/** The prior every result is pulled towards: the mean of all counted ratings, or 7 with none. */
export function priorMean(ratings: { score: number; counts: boolean }[]): number {
  const counted = ratings.filter((r) => r.counts)
  return counted.length ? counted.reduce((s, r) => s + r.score, 0) / counted.length : 7
}

/**
 * Ranks one category's nominees by a Bayesian average of counted ratings, so
 * three perfect 10s can't outrank forty 9s. Nominees under the minimum are
 * returned unranked (rank null), after the ranked ones.
 */
export function rankEntries(
  videoIds: string[],
  ratings: { videoId: string; score: number; counts: boolean }[],
  prior: number,
  opts: { priorWeight?: number; minCount?: number } = {}
): RankedEntry[] {
  const w = opts.priorWeight ?? POLL_RULES.priorWeight
  const min = opts.minCount ?? POLL_RULES.minCountedRatings
  const stats = new Map(videoIds.map((id) => [id, { sum: 0, count: 0 }]))
  for (const r of ratings) {
    const s = r.counts ? stats.get(r.videoId) : undefined
    if (!s) continue
    s.sum += r.score
    s.count += 1
  }
  const rows: RankedEntry[] = videoIds.map((videoId) => {
    const s = stats.get(videoId)!
    return { videoId, rank: null, count: s.count, average: s.count ? s.sum / s.count : 0, score: (w * prior + s.sum) / (w + s.count) }
  })
  const ranked = rows
    .filter((r) => r.count >= min)
    .sort((a, b) => b.score - a.score || b.count - a.count || b.average - a.average || a.videoId.localeCompare(b.videoId))
    .map((r, i) => ({ ...r, rank: i + 1 }))
  return [...ranked, ...rows.filter((r) => r.count < min)]
}

/** A stable shuffle, so the ballot's order doesn't favour whoever was nominated first. */
export function seededOrder<T>(items: T[], key: (item: T) => string, seed: string): T[] {
  const hash = (s: string) => {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }
  return items
    .map((item) => ({ item, h: hash(`${seed}:${key(item)}`) }))
    .sort((a, b) => a.h - b.h)
    .map((x) => x.item)
}

/** "The Matinee Poll", from the brand name, which is still changing. */
export function pollName(brand: string): string {
  return `The ${brand} Poll`
}
