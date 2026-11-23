import { prisma } from './prisma'
import { POLLS, buildBallot, pollConfig, priorMean, qualifiesAt, rankEntries } from './polls'

/**
 * The database side of polls. Definitions live in lib/polls.ts and are copied
 * in on first use, so there's nothing to seed by hand. The ballot is decided
 * once, when voting opens, and the results once, when it closes, so neither
 * can shift afterwards.
 */

let synced: Promise<void> | null = null

async function upsertRetrying<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op()
  } catch (error: any) {
    // Two cold starts can race to create the same row; the second just retries.
    if (error?.code === 'P2002') return op()
    throw error
  }
}

/** Copies the polls defined in lib/polls.ts into the database, once per server process. */
export function syncPolls(): Promise<void> {
  if (!synced) {
    synced = (async () => {
      for (const p of POLLS) {
        const data = {
          title: p.title,
          year: p.year,
          opensAt: new Date(p.opensAt),
          votingAt: new Date(p.votingAt),
          closesAt: new Date(p.closesAt),
          publishedAt: new Date(p.publishedAt),
          eligibleFrom: p.eligibleFrom ? new Date(p.eligibleFrom) : null,
          eligibleUntil: p.eligibleUntil ? new Date(p.eligibleUntil) : null,
        }
        const poll = await upsertRetrying(() =>
          prisma.poll.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data })
        )
        for (const [order, c] of p.categories.entries()) {
          const cdata = { title: c.title, blurb: c.blurb, order, maxSeconds: c.maxSeconds ?? null, minSeconds: c.minSeconds ?? null }
          await upsertRetrying(() =>
            prisma.pollCategory.upsert({
              where: { pollId_slug: { pollId: poll.id, slug: c.slug } },
              create: { pollId: poll.id, slug: c.slug, ...cdata },
              update: cdata,
            })
          )
        }
      }
    })().catch((error) => {
      synced = null
      throw error
    })
  }
  return synced
}

export async function loadPoll(slug: string) {
  if (!pollConfig(slug)) return null
  await syncPolls()
  return prisma.poll.findUnique({ where: { slug }, include: { categories: { orderBy: { order: 'asc' } } } })
}

export type LoadedPoll = NonNullable<Awaited<ReturnType<typeof loadPoll>>>

const unique = <T,>(xs: T[]) => Array.from(new Set(xs))

/** The members among these who count at a moment (lib/polls.ts qualifiesAt). */
export async function qualifyingUsers(userIds: string[], at: Date): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()
  const [users, counts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, createdAt: true } }),
    prisma.rating.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { _all: true } }),
  ])
  const n = new Map(counts.map((c) => [c.userId, c._count._all]))
  return new Set(users.filter((u) => qualifiesAt({ createdAt: u.createdAt, ratingCount: n.get(u.id) || 0 }, at)).map((u) => u.id))
}

/**
 * Every entry with its nominations, and how many come from accounts that
 * will count when voting opens. Includes the video's stored details.
 */
export async function entriesWithCounts(poll: LoadedPoll) {
  const entries = await prisma.pollEntry.findMany({
    where: { category: { pollId: poll.id } },
    select: {
      id: true,
      categoryId: true,
      videoId: true,
      removedAt: true,
      onBallot: true,
      createdAt: true,
      nominations: { select: { userId: true } },
      video: { select: { id: true, title: true, channel: true, duration: true, publishedAt: true, available: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  const counting = await qualifyingUsers(unique(entries.flatMap((e) => e.nominations.map((n) => n.userId))), poll.votingAt)
  return entries.map((e) => ({
    ...e,
    total: e.nominations.length,
    counted: e.nominations.filter((n) => counting.has(n.userId)).length,
  }))
}

export type EntryWithCounts = Awaited<ReturnType<typeof entriesWithCounts>>[number]

/** Which entries would be on the ballot if nominations closed now. */
export function provisionalBallot(poll: LoadedPoll, entries: EntryWithCounts[]): Set<string> {
  return buildBallot(
    entries.map((e) => ({ id: e.id, categoryId: e.categoryId, videoId: e.videoId, removed: !!e.removedAt || !e.video.available, counted: e.counted })),
    poll.categories.map((c) => c.id)
  )
}

/** Decides the ballot once voting has opened. Safe to call from many requests at once. */
export async function freezeBallotIfDue(poll: LoadedPoll, now: Date = new Date()): Promise<LoadedPoll> {
  if (poll.ballotFrozenAt || now < poll.votingAt) return poll
  const chosen = provisionalBallot(poll, await entriesWithCounts(poll))
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.poll.updateMany({ where: { id: poll.id, ballotFrozenAt: null }, data: { ballotFrozenAt: now } })
    if (claimed.count === 0) return
    await tx.pollEntry.updateMany({ where: { category: { pollId: poll.id } }, data: { onBallot: false } })
    if (chosen.size > 0) await tx.pollEntry.updateMany({ where: { id: { in: Array.from(chosen) } }, data: { onBallot: true } })
  })
  return (await loadPoll(poll.slug)) || poll
}

/**
 * Freezes the results once voting has closed. A rating counts if it was given
 * before the close, by an account that was a week old at the close and has
 * rated at least ten videos.
 */
export async function freezeResultsIfDue(poll: LoadedPoll, now: Date = new Date()): Promise<boolean> {
  if (poll.resultsFrozenAt || now < poll.closesAt) return false
  const current = await freezeBallotIfDue(poll, now)
  const ballot = await prisma.pollEntry.findMany({
    where: { category: { pollId: current.id }, onBallot: true, removedAt: null },
    select: { categoryId: true, videoId: true },
  })
  const videoIds = unique(ballot.map((e) => e.videoId))
  const ratings = await prisma.rating.findMany({
    where: { videoId: { in: videoIds }, ratedAt: { lt: current.closesAt } },
    select: { userId: true, videoId: true, score: true },
  })
  const counting = await qualifyingUsers(unique(ratings.map((r) => r.userId)), current.closesAt)
  const marked = ratings.map((r) => ({ videoId: r.videoId, score: r.score, counts: counting.has(r.userId) }))
  const prior = priorMean(marked)

  const rows = current.categories.flatMap((c) =>
    rankEntries(ballot.filter((e) => e.categoryId === c.id).map((e) => e.videoId), marked, prior).map((r) => ({
      categoryId: c.id,
      videoId: r.videoId,
      rank: r.rank,
      score: r.score,
      average: r.average,
      count: r.count,
    }))
  )

  let wrote = false
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.poll.updateMany({ where: { id: current.id, resultsFrozenAt: null }, data: { resultsFrozenAt: now } })
    if (claimed.count === 0) return
    await tx.pollResult.deleteMany({ where: { category: { pollId: current.id } } })
    if (rows.length > 0) await tx.pollResult.createMany({ data: rows })
    wrote = true
  })
  return wrote
}

/**
 * Whether a video's members' scores are sealed now because it's a nominee:
 * from the opening of voting until the results are out.
 */
export async function sealedFor(videoId: string, now: Date = new Date()) {
  const entries = await prisma.pollEntry.findMany({
    where: { videoId, removedAt: null, category: { poll: { votingAt: { lte: now }, publishedAt: { gt: now } } } },
    select: {
      onBallot: true,
      category: { select: { title: true, poll: { select: { slug: true, year: true, publishedAt: true, ballotFrozenAt: true } } } },
    },
  })
  // Until the ballot is decided (the first request after voting opens), any nominee is sealed.
  const entry = entries.find((e) => e.onBallot === true || !e.category.poll.ballotFrozenAt)
  if (!entry) return null
  const p = entry.category.poll
  return { poll: p.slug, year: p.year, category: entry.category.title, until: p.publishedAt.toISOString() }
}

/** Of these videos, the ones whose members' scores are sealed now (see sealedFor). */
export async function sealedSet(videoIds: string[], now: Date = new Date()): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set()
  const entries = await prisma.pollEntry.findMany({
    where: { videoId: { in: videoIds }, removedAt: null, category: { poll: { votingAt: { lte: now }, publishedAt: { gt: now } } } },
    select: { videoId: true, onBallot: true, category: { select: { poll: { select: { ballotFrozenAt: true } } } } },
  })
  return new Set(entries.filter((e) => e.onBallot === true || !e.category.poll.ballotFrozenAt).map((e) => e.videoId))
}

/** For the daily job: decide ballots and freeze results that are due. */
export async function settlePolls(now: Date = new Date()) {
  const done: string[] = []
  for (const p of POLLS) {
    const poll = await loadPoll(p.slug)
    if (!poll) continue
    if (!poll.ballotFrozenAt && now >= poll.votingAt) {
      await freezeBallotIfDue(poll, now)
      done.push(`${p.slug}: ballot`)
    }
    const fresh = await loadPoll(p.slug)
    if (fresh && (await freezeResultsIfDue(fresh, now))) done.push(`${p.slug}: results`)
  }
  return done
}
