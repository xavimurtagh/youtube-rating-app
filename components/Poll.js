import { useMemo, useState } from 'react';
import Link from 'next/link';
import Still from './Still';
import RatingStrip from './RatingStrip';
import { useSignIn } from './Human';
import { useToast } from './Toast';
import { useLibrary } from '../contexts/LibraryContext';
import { cleanVideoId } from '../utils/videoUtils';
import { durationSeconds, formatDuration, minutesLabel, spelled, withArticle } from '../lib/format';
import { POLL_RULES, pollDay } from '../lib/polls';

const t = (d) => new Date(d).getTime();

/** "01", "02": categories are numbered like a printed programme. */
export const ordinal = (i) => String(i + 1).padStart(2, '0');

/** "1–14 December" for a span inside one month, else "15 December – 15 January". */
function span(from, to) {
  const a = pollDay(from);
  const b = pollDay(to, { lastDay: true });
  const [ad, am] = a.split(' ');
  const [bd, bm] = b.split(' ');
  return am === bm ? `${ad}–${bd} ${am}` : `${a} – ${b}`;
}

/**
 * The three phases on one line, like a strip of film leader: the phase we're
 * in is drawn in ink, with an amber mark at today.
 */
export function PhaseLine({ poll, now = Date.now() }) {
  const phases = [
    { key: 'nominations', name: 'Nominations', from: poll.opensAt, to: poll.votingAt },
    { key: 'voting', name: 'Voting', from: poll.votingAt, to: poll.closesAt },
    { key: 'results', name: 'Results', from: poll.publishedAt, to: null },
  ];
  return (
    <ol className="phases" aria-label="How the poll runs">
      {phases.map((p) => {
        const start = t(p.from);
        const end = p.to ? t(p.to) : start + 864e5;
        const state = now >= end ? 'done' : now >= start ? 'now' : 'next';
        const at = state === 'now' && p.to ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : null;
        return (
          <li key={p.key} className="phases__step" data-state={state} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="phases__track" aria-hidden="true">
              {at != null && <span className="phases__now" style={{ left: `${at}%` }} />}
            </span>
            <span className="phases__name">{p.name}</span>
            <span className="phases__dates">{p.to ? span(p.from, p.to) : `From ${pollDay(p.from)}`}</span>
          </li>
        );
      })}
    </ol>
  );
}

function daysUntil(iso, now = Date.now()) {
  return Math.max(0, Math.ceil((t(iso) - now) / 864e5));
}

/** The opening paragraph, phase by phase. */
export function phaseLede(poll) {
  switch (poll.phase) {
    case 'upcoming':
      return `Five categories, chosen by members. From ${pollDay(poll.opensAt)}, nominate the videos you loved this year; then rate the nominees. Every vote is an ordinary rating.`;
    case 'nominations':
      return `Nominate up to three videos in each category, from your own 8s and above or by pasting a link. Anything two people nominate reaches the ballot. Nominations close on ${pollDay(poll.votingAt, { lastDay: true })}.`;
    case 'voting':
      return `Rate the nominees you’ve watched, from one to ten. Your rating is your vote, and one you gave before the poll counts too. Scores stay sealed until ${pollDay(poll.publishedAt)}.`;
    case 'counting':
      return `Voting has closed. Thank you for every rating. The results are out on ${pollDay(poll.publishedAt)}.`;
    default:
      return 'The results are in: the best of the year, as members rated it.';
  }
}

/** One quiet line under the hero: the countdown, or what the member still needs. */
export function StandingNote({ poll, standing, signedIn }) {
  const signIn = useSignIn();
  if (poll.phase === 'upcoming') {
    const d = daysUntil(poll.opensAt);
    return <p className="poll-note">{d <= 1 ? 'Nominations open tomorrow.' : `Nominations open in ${spelled(d)} days.`}</p>;
  }
  if (poll.phase === 'results' || poll.phase === 'counting') return null;
  if (!signedIn) {
    return (
      <p className="poll-note">
        <button type="button" className="textbtn" onClick={() => signIn()}>
          Sign in
        </button>{' '}
        to {poll.phase === 'nominations' ? 'nominate' : 'vote'}.
      </p>
    );
  }
  if (!standing || standing.counts) return null;
  const what = poll.phase === 'nominations' ? 'nominations' : 'votes';
  if (standing.tooNew) {
    return (
      <p className="poll-note">
        Your {what} are saved, but accounts made in the poll’s last week don’t count towards it.
      </p>
    );
  }
  const n = standing.ratingsNeeded;
  return (
    <p className="poll-note">
      Your {what} count once you’ve rated ten videos: {n === 1 ? 'one to go' : `${spelled(n)} to go`}.{' '}
      <Link className="link" href="/diary?tab=history">
        Rate a few
      </Link>
    </p>
  );
}

/** A filled or hollow sprocket mark, and the words for where a nomination stands. */
function Status({ entry }) {
  if (!entry.status) return null;
  const on = entry.status === 'ballot' || entry.status === 'elsewhere';
  const words =
    entry.status === 'removed'
      ? 'Taken off the ballot'
      : entry.status === 'unavailable'
        ? 'No longer on YouTube'
        : entry.status === 'ballot'
      ? 'On the ballot'
      : entry.status === 'elsewhere'
        ? `On the ballot${entry.elsewhere ? ` in ${entry.elsewhere}` : ''}`
        : entry.needs === 1
          ? 'Needs one more nomination'
          : `Needs ${spelled(entry.needs)} more nominations`;
  return (
    <span className="status" data-on={on}>
      <span className="status__mark" aria-hidden="true" />
      {words}
    </span>
  );
}

function AdminTools({ entry, onModerate }) {
  if (!entry.entryId) return null;
  return (
    <span className="admin-tools">
      <span className="meta">
        {entry.nominations} nominated · {entry.counted} count
      </span>
      {entry.flagged && (
        <button type="button" className="textbtn textbtn--danger" onClick={() => onModerate(entry, 'clear-flag')}>
          Burst of ratings: clear flag
        </button>
      )}
      <button type="button" className="textbtn textbtn--danger" onClick={() => onModerate(entry, entry.removed ? 'restore' : 'remove')}>
        {entry.removed ? 'Restore' : 'Take off'}
      </button>
    </span>
  );
}

function lengthOf(e) {
  return formatDuration(e.duration);
}

/** Your 8s and above that fit this category and the poll's year. */
function useEligibleRated(poll, category, taken) {
  const lib = useLibrary();
  return useMemo(() => {
    const from = poll.eligibleFrom ? t(poll.eligibleFrom) : -Infinity;
    const until = poll.eligibleUntil ? t(poll.eligibleUntil) : Infinity;
    return lib.ratedList
      .filter((r) => r.score >= 8 && !taken.has(r.video.id))
      .filter((r) => {
        const at = r.video.publishedAt ? t(r.video.publishedAt) : null;
        if (at == null || at < from || at >= until) return false;
        const s = durationSeconds(r.video.duration);
        if (category.maxSeconds != null && (s == null || s > category.maxSeconds)) return false;
        if (category.minSeconds != null && (s == null || s < category.minSeconds)) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score || String(b.ratedAt).localeCompare(String(a.ratedAt)));
  }, [lib.ratedList, poll, category, taken]);
}

function NominatePanel({ poll, category, taken, onNominate, onClose, busy }) {
  const [value, setValue] = useState('');
  const [more, setMore] = useState(false);
  const picks = useEligibleRated(poll, category, taken);
  const shown = more ? picks : picks.slice(0, 4);

  const submit = (e) => {
    e.preventDefault();
    if (value.trim()) onNominate(value.trim()).then((ok) => ok && setValue(''));
  };

  return (
    <div className="nominate">
      <div className="nominate__head">
        <p className="nominate__title">Nominate in {category.title}</p>
        <button type="button" className="textbtn" onClick={onClose}>
          Close <span aria-hidden="true">×</span>
        </button>
      </div>
      <form className="searchbar" onSubmit={submit}>
        <label className="sr-only" htmlFor={`nominate-${category.slug}`}>
          Paste a YouTube link to nominate in {category.title}
        </label>
        <input
          id={`nominate-${category.slug}`}
          className="field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a YouTube link"
          autoComplete="off"
          inputMode="url"
        />
        <button type="submit" className="btn btn--small" disabled={busy || !cleanVideoId(value.trim())}>
          Nominate
        </button>
      </form>
      {picks.length > 0 ? (
        <>
          <p className="nominate__or">Or one of your 8s and above from {poll.year}:</p>
          <div className="rows">
            {shown.map((r) => (
              <div key={r.video.id} className="row row--compact">
                <Still id={r.video.id} title={r.video.title} size="sm" />
                <span className="row__body">
                  <span className="row__title">{r.video.title || 'Untitled video'}</span>
                  <span className="row__sub">You gave it {withArticle(r.score)}</span>
                </span>
                <span className="row__end">
                  <button type="button" className="btn btn--small btn--ghost" disabled={busy} onClick={() => onNominate(r.video.id)}>
                    Nominate
                  </button>
                </span>
              </div>
            ))}
          </div>
          {picks.length > shown.length && (
            <button type="button" className="textbtn" onClick={() => setMore(true)}>
              {spelled(picks.length - shown.length, { capital: true })} more of yours
            </button>
          )}
        </>
      ) : (
        <p className="setting__desc">
          Videos you’ve rated 8 or more that were published in {poll.year} appear here, ready to nominate.
          {category.maxSeconds != null && ` In ${category.title}, they have to be under ${Math.round((category.maxSeconds + 1) / 60)} minutes.`}
        </p>
      )}
    </div>
  );
}

/** Your three nominations in a category, as three frames waiting to be filled. */
function Slots({ category, open, onOpen, onWithdraw, busy }) {
  const slots = Array.from({ length: POLL_RULES.nominationsPerCategory }, (_, i) => category.mine[i] || null);
  const free = slots.findIndex((s) => !s);
  return (
    <ol className="slots" aria-label={`Your nominations in ${category.title}`}>
      {slots.map((e, i) =>
        e ? (
          <li key={e.videoId} className="slot slot--filled">
            <Link href={`/watch/${e.videoId}`} aria-label={e.title} className="slot__frame">
              <Still id={e.videoId} title={e.title} />
            </Link>
            <span className="slot__title">{e.title}</span>
            <Status entry={e} />
            <button type="button" className="textbtn" disabled={busy} onClick={() => onWithdraw(e.videoId)}>
              Withdraw
            </button>
          </li>
        ) : (
          <li key={`empty-${i}`} className="slot">
            <button
              type="button"
              className="slot__frame slot__empty"
              onClick={onOpen}
              disabled={i !== free}
              aria-expanded={i === free ? open : undefined}
              data-open={i === free && open ? 'true' : undefined}
            >
              <span className="slot__no">{i + 1}</span>
              {i === free && <span className="slot__cta">{open ? 'Choose below ↓' : 'Nominate'}</span>}
            </button>
          </li>
        )
      )}
    </ol>
  );
}

/** A category during nominations: your three, then everyone else's to second. */
export function NominationCategory({ poll, category, index, signedIn, open, onToggle, act, busy, admin }) {
  const signIn = useSignIn();
  const taken = useMemo(() => new Set([...category.mine, ...category.entries.filter((e) => e.mine)].map((e) => e.videoId)), [category]);
  const full = category.mine.length >= POLL_RULES.nominationsPerCategory;

  return (
    <section className="ballot-cat" id={category.slug}>
      <header className="ballot-cat__head">
        <span className="ballot-cat__no">{ordinal(index)}</span>
        <h2 className="ballot-cat__title">{category.title}</h2>
        <p className="ballot-cat__blurb">{category.blurb}</p>
      </header>

      <div className="ballot-cat__body">
        {signedIn ? (
          <>
            <Slots category={category} open={open} onOpen={onToggle} onWithdraw={(id) => act('withdraw', category, id)} busy={busy} />
            {open && !full && (
              <NominatePanel
                poll={poll}
                category={category}
                taken={taken}
                busy={busy}
                onClose={onToggle}
                onNominate={(v) => act('nominate', category, v)}
              />
            )}
          </>
        ) : (
          <p className="prose">
            <button type="button" className="textbtn" onClick={() => signIn()}>
              Sign in
            </button>{' '}
            to nominate up to three.
          </p>
        )}

        {category.entries.length > 0 && (
          <div className="ballot-cat__others">
            <h3 className="ballot-cat__sub">Nominated by others</h3>
            <div className="rows">
              {category.entries.map((e) => (
                <div key={e.videoId} className="row row--compact" data-removed={e.removed || undefined}>
                  <Link href={`/watch/${e.videoId}`} aria-label={e.title}>
                    <Still id={e.videoId} title={e.title} size="sm" />
                  </Link>
                  <span className="row__body">
                    <Link href={`/watch/${e.videoId}`} className="row__title">
                      {e.title}
                    </Link>
                    <span className="row__sub">{[e.channel, lengthOf(e)].filter(Boolean).join(' · ')}</span>
                    <Status entry={e} />
                    {admin && <AdminTools entry={e} onModerate={(x, a) => act(a, category, x)} />}
                  </span>
                  <span className="row__end">
                    {signedIn && !e.mine && !full && (
                      <button type="button" className="btn btn--small btn--ghost" disabled={busy} onClick={() => act('nominate', category, e.videoId)}>
                        Second it
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** A category's ballot: every nominee with the rating strip. Your rating is your vote. */
export function BallotCategory({ poll, category, index, signedIn, admin, act }) {
  const lib = useLibrary();
  const toast = useToast();
  const signIn = useSignIn();
  const closed = poll.phase !== 'voting';
  const rated = category.entries.filter((e) => lib.ratingOf(e.videoId) != null).length;
  const n = category.entries.length;

  const vote = async (entry, score) => {
    if (!signedIn) {
      signIn();
      return;
    }
    try {
      await lib.rate({ id: entry.videoId, title: entry.title, channel: entry.channel }, score);
      toast(`Saved. You gave it ${withArticle(score)}.`);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  return (
    <section className="ballot-cat" id={category.slug}>
      <header className="ballot-cat__head">
        <span className="ballot-cat__no">{ordinal(index)}</span>
        <h2 className="ballot-cat__title">{category.title}</h2>
        <p className="ballot-cat__blurb">{category.blurb}</p>
        {signedIn && n > 0 && (
          <p className="ballot-cat__count">
            {rated === 0
              ? `${spelled(n, { capital: true })} nominees.`
              : rated === n
                ? `You’ve rated all ${spelled(n)}.`
                : `You’ve rated ${spelled(rated)} of ${spelled(n)}.`}
          </p>
        )}
      </header>

      <div className="ballot-cat__body">
        {n === 0 ? (
          <p className="prose">No nominee had enough nominations to make this ballot.</p>
        ) : (
          <div className="rows">
            {category.entries.map((e) => {
              const mine = lib.ratingOf(e.videoId);
              const s = durationSeconds(e.duration);
              return (
                <div key={e.videoId} className="row ballot-row" data-removed={e.removed || undefined}>
                  <Link href={`/watch/${e.videoId}`} aria-label={e.title}>
                    <Still id={e.videoId} title={e.title} size="sm" />
                  </Link>
                  <span className="row__body">
                    <Link href={`/watch/${e.videoId}`} className="row__title">
                      {e.title}
                    </Link>
                    <span className="row__sub">{[e.channel, s ? minutesLabel(s) : null].filter(Boolean).join(' · ')}</span>
                    {admin && <AdminTools entry={e} onModerate={(x, a) => act(a, category, x)} />}
                  </span>
                  <span className="row__end">
                    {closed ? (
                      <RatingStrip value={mine} readOnly size="sm" />
                    ) : (
                      <RatingStrip value={mine} onChange={(score) => vote(e, score)} size="sm" label={`Rate ${e.title}`} />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/** One category's results: the members' choice, large, then the runners-up. */
export function ResultsCategory({ category, index }) {
  const w = category.winner;
  return (
    <section className="result-cat" id={category.slug}>
      <header className="ballot-cat__head">
        <span className="ballot-cat__no">{ordinal(index)}</span>
        <h2 className="ballot-cat__title">{category.title}</h2>
        <p className="ballot-cat__blurb">{category.blurb}</p>
      </header>
      {w ? (
        <div className="ballot-cat__body">
          <article className="winner">
            <Link href={`/watch/${w.videoId}`} aria-label={w.title} className="winner__still">
              <Still id={w.videoId} title={w.title} size="lg" />
            </Link>
            <div className="winner__text">
              <p className="winner__kicker">The members’ choice</p>
              <Link href={`/watch/${w.videoId}`}>
                <h3 className="winner__title">{w.title}</h3>
              </Link>
              <p className="entry__by">{w.channel}</p>
              <p className="winner__score">
                <span className="score__n">{w.score.toFixed(1)}</span>
                <span className="score__caption">from {w.count} counted ratings</span>
              </p>
            </div>
          </article>
          {category.runnersUp.length > 0 && (
            <ol className="runners">
              {category.runnersUp.map((r) => (
                <li key={r.videoId}>
                  <Link href={`/watch/${r.videoId}`} className="runner">
                    <span className="runner__rank">{r.rank}</span>
                    <span className="runner__title">{r.title}</span>
                    <span className="runner__by">{r.channel}</span>
                    <span className="runner__score">
                      {r.score.toFixed(1)}
                      <small> · {r.count}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <div className="ballot-cat__body">
          <p className="prose">Not enough counted ratings to name a winner here this year.</p>
        </div>
      )}
    </section>
  );
}
