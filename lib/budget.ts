import { prisma } from './prisma'
import { LOOKUPS_DAILY, LOOKUPS_PER_MEMBER_DAILY, pacificDayKey } from './quota'

/**
 * Spends one unit of a named budget atomically (a single INSERT … ON CONFLICT
 * increment), so simultaneous requests can't all slip past the limit.
 * Returns false once the budget is used up.
 */
export async function spend(key: string, limit: number): Promise<boolean> {
  const row = await prisma.usageCounter.upsert({
    where: { key },
    create: { key, count: 1 },
    update: { count: { increment: 1 } },
  })
  return row.count <= limit
}

/**
 * One videos.list call on behalf of a member: false once their allowance or
 * the site's for this Pacific day is spent. Anything that would ask YouTube
 * about a video we don't hold goes through here first.
 */
export async function spendLookup(userId: string, now: Date = new Date()): Promise<boolean> {
  const day = pacificDayKey(now)
  if (!(await spend(`lookup:${userId}:${day}`, LOOKUPS_PER_MEMBER_DAILY))) return false
  return spend(`lookup:${day}`, LOOKUPS_DAILY)
}
