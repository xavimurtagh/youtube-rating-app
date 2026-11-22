import { prisma } from './prisma'
import { getVideosDetails } from '../utils/youtube'
import { spendLookup } from './budget'
import { REFRESH_AFTER_DAYS } from './quota'

/**
 * Video rows are shared by every member, so metadata sent by a browser is
 * never written over an existing row. A new row takes YouTube's own details
 * when the API answers; if it can't (quota, network), the client's hints are
 * trimmed and stored with refreshedAt null, so the daily job replaces them.
 */

export type VideoHints = { title?: unknown; channel?: unknown; thumbnail?: unknown; category?: unknown }

const THUMBNAIL = /^https:\/\/i\.ytimg\.com\/vi(_webp)?\/[A-Za-z0-9_-]{11}\/[A-Za-z0-9_]+\.(jpg|webp)$/

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

/** Client hints, made safe to store: plain strings, capped, YouTube thumbnails only. */
export function sanitizeHints(hints: VideoHints = {}) {
  const thumbnail = clip(hints.thumbnail, 300)
  return {
    title: clip(hints.title, 200) || 'Untitled video',
    channel: clip(hints.channel, 120),
    thumbnail: THUMBNAIL.test(thumbnail) ? thumbnail : null,
    category: clip(hints.category, 60) || null,
  }
}

/** The stored copy of what YouTube told us about a video. */
export function detailsData(v: any, now: Date = new Date()) {
  return {
    title: v.title,
    channel: v.channel,
    thumbnail: v.thumbnail || null,
    ...(v.category ? { category: v.category } : {}),
    duration: v.duration || null,
    publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
    available: true,
    refreshedAt: now,
  }
}

export type EnsureResult = 'ok' | 'missing' | 'limited'

/**
 * Makes sure a Video row exists for a cleaned 11-character id.
 *
 * Asking YouTube spends one of the member's daily lookups (lib/budget.ts);
 * once they're gone a new video is refused with 'limited' and nothing is
 * written. With `details`, an existing row that lacks its length or publish
 * date, or is due a refresh, is refreshed too, for features that filter on
 * them (Saved, the poll). Callers that need those fields check them after.
 *
 * Returns 'missing' when YouTube answered and has no such video.
 */
export async function ensureVideo(
  id: string,
  hints: VideoHints = {},
  userId: string,
  opts: { details?: boolean } = {}
): Promise<EnsureResult> {
  const existing = await prisma.video.findUnique({
    where: { id },
    select: { id: true, duration: true, publishedAt: true, refreshedAt: true, available: true },
  })

  if (existing) {
    if (!opts.details) return 'ok'
    if (!existing.available) return 'missing'
    const due = !existing.refreshedAt || existing.refreshedAt.getTime() < Date.now() - REFRESH_AFTER_DAYS * 864e5
    if (!due && existing.duration && existing.publishedAt) return 'ok'
    if (!(await spendLookup(userId))) return 'ok'
    try {
      const v = (await getVideosDetails([id])).get(id)
      if (!v) {
        await prisma.video.update({
          where: { id },
          data: { available: false, title: 'Unavailable video', channel: '', thumbnail: null, refreshedAt: new Date() },
        })
        return 'missing'
      }
      await prisma.video.update({ where: { id }, data: detailsData(v) })
    } catch {
      // YouTube couldn't answer; the row we have will do until the daily job.
    }
    return 'ok'
  }

  if (!(await spendLookup(userId))) return 'limited'

  let data: Record<string, unknown> | null = null
  try {
    const v = (await getVideosDetails([id])).get(id)
    if (!v) return 'missing'
    data = detailsData(v)
  } catch {
    data = { ...sanitizeHints(hints), refreshedAt: null }
  }

  await prisma.video.upsert({ where: { id }, create: { id, ...(data as any) }, update: {} })
  return 'ok'
}

/** Words for a refused lookup, shared by every route that adds videos. */
export const LIMITED_MESSAGE = 'You’ve added a lot of new videos today. Try that one again tomorrow.'

/** Prisma errors worth retrying: the database was briefly unreachable. */
export function isConnectionError(error: any): boolean {
  const code = error && error.code
  return ['P1001', 'P1002', 'P1008', 'P1017'].includes(code) || /Can't reach database/i.test(String(error?.message || ''))
}
