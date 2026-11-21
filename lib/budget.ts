import { prisma } from './prisma'

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
