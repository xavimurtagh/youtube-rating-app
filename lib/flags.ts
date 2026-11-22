import { prisma } from './prisma'

/** Ratings on one video within an hour that hold it for a person to look at. */
export const BURST_PER_HOUR = Number(process.env.RATING_BURST_PER_HOUR || 15)

/**
 * Flags a video for review when it gets a sudden burst of ratings, at most
 * once a day per video. Nothing is hidden automatically: admins see the flag
 * beside poll entries and decide. Returns true when a new flag was raised.
 */
export async function flagRatingBurst(videoId: string, now: Date = new Date()): Promise<boolean> {
  const count = await prisma.rating.count({ where: { videoId, ratedAt: { gte: new Date(now.getTime() - 3600_000) } } })
  if (count < BURST_PER_HOUR) return false
  const recent = await prisma.reviewFlag.findFirst({
    where: { kind: 'rating-burst', videoId, createdAt: { gte: new Date(now.getTime() - 24 * 3600_000) } },
    select: { id: true },
  })
  if (recent) return false
  await prisma.reviewFlag.create({ data: { kind: 'rating-burst', videoId, data: { ratingsInHour: count } } })
  return true
}
