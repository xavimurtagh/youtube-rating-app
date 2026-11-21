import { prisma } from './prisma'
import { getVideosDetails } from '../utils/youtube'

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

/**
 * Makes sure a Video row exists for a cleaned 11-character id.
 * Returns 'missing' when YouTube answered and has no such video.
 */
export async function ensureVideo(id: string, hints: VideoHints = {}): Promise<'ok' | 'missing'> {
  const existing = await prisma.video.findUnique({ where: { id }, select: { id: true } })
  if (existing) return 'ok'

  let data: Record<string, unknown> | null = null
  try {
    const found = await getVideosDetails([id])
    const v = found.get(id)
    if (!v) return 'missing'
    data = {
      title: v.title,
      channel: v.channel,
      thumbnail: v.thumbnail || null,
      category: v.category || null,
      duration: v.duration || null,
      publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
      refreshedAt: new Date(),
    }
  } catch {
    data = { ...sanitizeHints(hints), refreshedAt: null }
  }

  await prisma.video.upsert({ where: { id }, create: { id, ...(data as any) }, update: {} })
  return 'ok'
}

/** Prisma errors worth retrying: the database was briefly unreachable. */
export function isConnectionError(error: any): boolean {
  const code = error && error.code
  return ['P1001', 'P1002', 'P1008', 'P1017'].includes(code) || /Can't reach database/i.test(String(error?.message || ''))
}
