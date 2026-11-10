/**
 * Helpers for staying inside the YouTube Data API quota.
 *
 * Since June 2026 the YouTube Data API splits quota into buckets: search.list
 * has its own allowance (100 calls a day by default), while videos.list costs
 * 1 unit per call for up to 50 ids from the general 10,000-unit bucket. Both
 * reset at midnight Pacific time. Check the Cloud Console Quotas page for the
 * project's current limits; raise them through YouTube's audit form.
 */

/** How long a search result is reused before YouTube is asked again. */
export const SEARCH_CACHE_HOURS = 24

/**
 * search.list calls allowed per Pacific day, across everyone. Kept a little
 * under the bucket so a burst can't hit YouTube's hard limit; raise it with
 * the env var once a quota increase is granted.
 */
export const SEARCH_DAILY_CALLS = Number(process.env.YOUTUBE_SEARCH_DAILY_CALLS || 90)

/** Stored video details are refreshed once they are this old (policy limit: 30). */
export const REFRESH_AFTER_DAYS = 25

/** YouTube searches one member may trigger per Pacific day (cache hits are free). */
export const SEARCH_PER_MEMBER_DAILY = Number(process.env.YOUTUBE_SEARCH_PER_MEMBER || 15)

/** One cache key per meaningfully different query. */
export function normaliseQuery(q: string): string {
  return q.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 120)
}

/** The instant the current YouTube quota day began (midnight in Los Angeles). */
export function startOfPacificDay(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  const elapsed = ((get('hour') * 60 + get('minute')) * 60 + get('second')) * 1000 + now.getUTCMilliseconds()
  return new Date(now.getTime() - elapsed)
}

/** The current YouTube quota day as YYYY-MM-DD in Los Angeles, for counter keys. */
export function pacificDayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now)
}
