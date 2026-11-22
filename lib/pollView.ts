import { prisma } from './prisma'
import { isAdmin } from './admin'
import { POLL_RULES, phaseOf, qualifiesAt, seededOrder, type PollPhase } from './polls'
import {
  entriesWithCounts,
  freezeBallotIfDue,
  freezeResultsIfDue,
  loadPoll,
  provisionalBallot,
  type EntryWithCounts,
  type LoadedPoll,
} from './pollStore'

/**
 * What a poll page shows, phase by phase. Nothing here reveals scores: during
 * nominations a nominee shows only whether it's on the ballot or how many more
 * nominations it needs; from voting on, nominees are listed in a shuffled
 * order. Admins also see counts, flags and removed entries.
 */

type Me = { id: string; email: string; createdAt: Date } | null

const dayMs = 864e5

function pollSummary(poll: LoadedPoll, phase: PollPhase) {
  return {
    slug: poll.slug,
    title: poll.title,
    year: poll.year,
    phase,
    opensAt: poll.opensAt.toISOString(),
    votingAt: poll.votingAt.toISOString(),
    closesAt: poll.closesAt.toISOString(),
    publishedAt: poll.publishedAt.toISOString(),
    eligibleFrom: poll.eligibleFrom ? poll.eligibleFrom.toISOString() : null,
    eligibleUntil: poll.eligibleUntil ? poll.eligibleUntil.toISOString() : null,
    rules: POLL_RULES,
  }
}

function videoPart(e: EntryWithCounts) {
  return {
    videoId: e.videoId,
    title: e.video.title,
    channel: e.video.channel,
    duration: e.video.duration,
    publishedAt: e.video.publishedAt ? e.video.publishedAt.toISOString() : null,
    available: e.video.available,
  }
}

/** Where the member stands: whether their nominations or votes will count, and why not. */
async function standingOf(me: Me, poll: LoadedPoll, phase: PollPhase) {
  if (!me) return null
  const ratingCount = await prisma.rating.count({ where: { userId: me.id } })
  const at = phase === 'upcoming' || phase === 'nominations' ? poll.votingAt : poll.closesAt
  const tooNew = me.createdAt.getTime() > at.getTime() - POLL_RULES.minAccountDays * dayMs
  return {
    ratingCount,
    counts: qualifiesAt({ createdAt: me.createdAt, ratingCount }, at),
    tooNew,
    ratingsNeeded: Math.max(0, POLL_RULES.minRatings - ratingCount),
    /** The day from which this account is old enough. */
    countsFrom: new Date(me.createdAt.getTime() + POLL_RULES.minAccountDays * dayMs).toISOString(),
  }
}

export async function pollView(slug: string, me: Me, now: Date = new Date()) {
  let poll = await loadPoll(slug)
  if (!poll) return null
  const phase = phaseOf(poll, now)
  if (phase !== 'upcoming' && phase !== 'nominations') poll = await freezeBallotIfDue(poll, now)
  const admin = isAdmin(me)

  const entries = phase === 'upcoming' ? [] : await entriesWithCounts(poll)
  const mineIds = me
    ? new Set(
        (
          await prisma.pollNomination.findMany({
            where: { userId: me.id, entry: { category: { pollId: poll.id } } },
            select: { entryId: true },
          })
        ).map((n) => n.entryId)
      )
    : new Set<string>()

  const live = phase === 'nominations' ? provisionalBallot(poll, entries) : null
  const placed = new Map<string, string>() // videoId -> category title where it's headed
  if (live) {
    for (const e of entries) {
      if (live.has(e.id)) placed.set(e.videoId, poll.categories.find((c) => c.id === e.categoryId)?.title || '')
    }
  }

  const flagged = admin
    ? new Set(
        (
          await prisma.reviewFlag.findMany({
            where: { kind: 'rating-burst', resolvedAt: null, videoId: { in: entries.map((e) => e.videoId) } },
            select: { videoId: true },
          })
        ).map((f) => f.videoId)
      )
    : new Set<string>()

  const adminPart = (e: EntryWithCounts) =>
    admin ? { entryId: e.id, removed: !!e.removedAt, nominations: e.total, counted: e.counted, flagged: flagged.has(e.videoId) } : {}

  const threshold = POLL_RULES.nominationsToBallot
  const statusOf = (e: EntryWithCounts) => {
    if (e.removedAt) return { status: 'removed' as const }
    if (!e.video.available) return { status: 'unavailable' as const }
    if (live?.has(e.id)) return { status: 'ballot' as const }
    if (e.counted >= threshold) return { status: 'elsewhere' as const, elsewhere: placed.get(e.videoId) || null }
    return { status: 'needs' as const, needs: threshold - e.counted }
  }

  const categories = poll.categories.map((c) => {
    const here = entries.filter((e) => e.categoryId === c.id)
    const mine = here.filter((e) => mineIds.has(e.id))
    let list: EntryWithCounts[] = []
    if (phase === 'nominations') {
      const visible = here.filter((e) => !mineIds.has(e.id) && (admin || (!e.removedAt && e.video.available)))
      const weight = (e: EntryWithCounts) => {
        const s = statusOf(e)
        return s.status === 'needs' ? s.needs : s.status === 'ballot' ? threshold + 1 : threshold + 2
      }
      list = visible.sort((a, b) => weight(a) - weight(b) || b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 24)
    } else if (phase !== 'upcoming') {
      list = seededOrder(
        here.filter((e) => e.onBallot && (admin || (!e.removedAt && e.video.available))),
        (e) => e.videoId,
        me?.id || poll.slug
      )
    }
    return {
      slug: c.slug,
      title: c.title,
      blurb: c.blurb,
      maxSeconds: c.maxSeconds,
      minSeconds: c.minSeconds,
      mine: mine.map((e) => ({ ...videoPart(e), ...(phase === 'nominations' ? statusOf(e) : {}), ...adminPart(e) })),
      entries: list.map((e) => ({
        ...videoPart(e),
        mine: mineIds.has(e.id),
        ...(phase === 'nominations' ? statusOf(e) : {}),
        ...adminPart(e),
      })),
    }
  })

  return { poll: pollSummary(poll, phase), categories, standing: await standingOf(me, poll, phase), admin }
}

/** The published results: each category's winner and runners-up. Admins can preview them once voting closes. */
export async function resultsView(slug: string, me: Me, now: Date = new Date()) {
  const poll = await loadPoll(slug)
  if (!poll) return null
  const phase = phaseOf(poll, now)
  const admin = isAdmin(me)
  const open = phase === 'results' || (admin && phase === 'counting')
  if (!open) return { poll: pollSummary(poll, phase), categories: [], ready: false, preview: false }

  await freezeResultsIfDue(poll, now)
  const rows = await prisma.pollResult.findMany({ where: { category: { pollId: poll.id } } })
  const videos = await prisma.video.findMany({
    where: { id: { in: rows.map((r) => r.videoId) } },
    select: { id: true, title: true, channel: true, duration: true, publishedAt: true, available: true },
  })
  const byId = new Map(videos.map((v) => [v.id, v]))
  const round1 = (n: number) => Math.round(n * 10) / 10

  const categories = poll.categories.map((c) => {
    const ranked = rows
      .filter((r) => r.categoryId === c.id && r.rank != null)
      .sort((a, b) => (a.rank as number) - (b.rank as number))
      .slice(0, 1 + POLL_RULES.runnersUp)
      .map((r) => {
        const v = byId.get(r.videoId)
        return {
          rank: r.rank as number,
          videoId: r.videoId,
          title: v?.available ? v.title : 'No longer on YouTube',
          channel: v?.available ? v.channel : '',
          duration: v?.duration || null,
          publishedAt: v?.publishedAt ? v.publishedAt.toISOString() : null,
          available: !!v?.available,
          score: round1(r.score),
          count: r.count,
        }
      })
    return {
      slug: c.slug,
      title: c.title,
      blurb: c.blurb,
      winner: ranked[0] || null,
      runnersUp: ranked.slice(1),
      unranked: rows.filter((r) => r.categoryId === c.id && r.rank == null).length,
    }
  })

  const counted = rows.reduce((n, r) => n + r.count, 0)
  return { poll: pollSummary(poll, phase), categories, ready: true, preview: phase !== 'results', countedRatings: counted }
}
