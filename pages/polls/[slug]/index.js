import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Still from '../../../components/Still';
import { Loading } from '../../../components/Layout';
import { useToast } from '../../../components/Toast';
import { BallotCategory, NominationCategory, PhaseLine, StandingNote, ordinal, phaseLede } from '../../../components/Poll';
import { cleanVideoId } from '../../../utils/videoUtils';
import { POLLS, pollConfig, pollDay, pollName } from '../../../lib/polls';
import { BRAND } from '../../../lib/brand';

export async function getStaticPaths() {
  return { paths: POLLS.map((p) => ({ params: { slug: p.slug } })), fallback: false };
}

export async function getStaticProps({ params }) {
  return { props: { slug: params.slug } };
}

/** Before nominations open: the five categories, set like a programme's contents. */
function Contents({ categories }) {
  return (
    <ol className="contents">
      {categories.map((c, i) => (
        <li key={c.slug} className="contents__item">
          <span className="ballot-cat__no">{ordinal(i)}</span>
          <span className="contents__title">{c.title}</span>
          <span className="contents__blurb">{c.blurb}</span>
        </li>
      ))}
    </ol>
  );
}

/** Arriving from a watch page with ?nominate=<id>: choose the category, one tap. */
function Incoming({ id, categories, act, onClose, busy }) {
  const [video, setVideo] = useState(null);
  useEffect(() => {
    fetch('/api/video-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoIds: [id] }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setVideo((b && b.videos && b.videos[0]) || null))
      .catch(() => {});
  }, [id]);
  return (
    <section className="incoming" aria-label="Nominate this video">
      <Still id={id} title={video?.title} />
      <div className="stack">
        <p className="h3">{video?.title || 'This video'}</p>
        <p className="prose">Which category is it for?</p>
        <div className="chips">
          {categories.map((c) => (
            <button key={c.slug} type="button" className="chip" disabled={busy} onClick={() => act('nominate', c, id).then((ok) => ok && onClose())}>
              {c.title}
            </button>
          ))}
        </div>
        <button type="button" className="textbtn" onClick={onClose}>
          Not now
        </button>
      </div>
    </section>
  );
}

function Rules({ poll }) {
  const year = poll.year;
  return (
    <section className="poll-rules">
      <h2 className="h3">How the poll works</h2>
      <ol className="steps">
        <li>
          <p>
            Nominate up to three videos in each category. Anything two people nominate reaches the ballot, in the
            category most people chose for it.
          </p>
        </li>
        <li>
          <p>Anything published on YouTube in {year} can be nominated. Shorts have to be under ten minutes.</p>
        </li>
        <li>
          <p>
            Votes are ratings from one to ten. Ratings from accounts made in the poll’s last week, or with fewer than
            ten ratings, are kept but not counted.
          </p>
        </li>
        <li>
          <p>
            Nominees are ranked by a weighted average, so a few perfect scores can’t beat many great ones. Scores stay
            sealed until {pollDay(poll.publishedAt)}.
          </p>
        </li>
      </ol>
    </section>
  );
}

export default function PollPage({ slug }) {
  const router = useRouter();
  const { status } = useSession();
  const toast = useToast();
  const config = pollConfig(slug);
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const signedIn = status === 'authenticated';
  const incomingId = cleanVideoId(router.query.nominate);

  const load = useCallback(() => {
    fetch(`/api/polls/${slug}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('The poll didn’t load. Try again in a moment.'))))
      .then((v) => {
        setView(v);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (status !== 'loading') load();
  }, [status, load]);

  const act = useCallback(
    async (kind, category, value) => {
      setBusy(true);
      try {
        const moderating = kind === 'remove' || kind === 'restore' || kind === 'clear-flag';
        const res = await fetch(`/api/polls/${slug}/${moderating ? 'moderate' : 'nominate'}`, {
          method: kind === 'withdraw' ? 'DELETE' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(moderating ? { entryId: value.entryId, action: kind } : { category: category.slug, video: value }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'That didn’t work. Try again.');
        setView(body);
        if (kind === 'nominate') toast(`Nominated in ${category.title}.`);
        else if (kind === 'withdraw') toast('Nomination withdrawn.');
        else toast('Done.');
        return true;
      } catch (e) {
        toast(e.message, { tone: 'error' });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [slug, toast]
  );

  const closeIncoming = () => router.replace(`/polls/${slug}`, undefined, { shallow: true });

  const name = pollName(BRAND.name);
  const poll = view?.poll;
  const head = (
    <Head>
      <title>{`${name} ${config.year} — ${BRAND.name}`}</title>
      <meta name="description" content={`${config.title}, chosen by members. Nominations ${pollDay(config.opensAt)}–${pollDay(config.votingAt, { lastDay: true })}.`} />
      <meta property="og:title" content={`${name}: ${config.title.toLowerCase()}`} />
      <meta property="og:description" content="Five categories, chosen by members. Every vote is a rating." />
    </Head>
  );

  if (error && !view) {
    return (
      <>
        {head}
        <div className="page">
          <p className="lede" style={{ paddingTop: 'var(--s-9)' }}>
            {error}
          </p>
        </div>
      </>
    );
  }
  if (!poll) return <>{head}<Loading /></>;

  const phase = poll.phase;
  const nominating = phase === 'nominations';

  return (
    <>
      {head}
      <div className="page">
        <header className="poll-hero">
          <span className="poll-hero__year" aria-hidden="true">
            ’{String(poll.year).slice(2)}
          </span>
          <p className="dateline">{name} · Members’ choice</p>
          <h1 className="display">
            The best of YouTube in <em>{poll.year}</em>
          </h1>
          <p className="lede">{phaseLede(poll)}</p>
          <PhaseLine poll={poll} />
          <StandingNote poll={poll} standing={view.standing} signedIn={signedIn} />
          {phase === 'results' && (
            <div>
              <Link href={`/polls/${slug}/results`} className="btn">
                See the results
              </Link>
            </div>
          )}
          {view.admin && phase === 'counting' && (
            <Link href={`/polls/${slug}/results`} className="arrow-link">
              Preview the results (admins only) <span aria-hidden="true">→</span>
            </Link>
          )}
        </header>

        {nominating && signedIn && incomingId && (
          <Incoming id={incomingId} categories={view.categories} act={act} onClose={closeIncoming} busy={busy} />
        )}

        {phase === 'upcoming' && <Contents categories={view.categories} />}

        {nominating &&
          view.categories.map((c, i) => (
            <NominationCategory
              key={c.slug}
              poll={poll}
              category={c}
              index={i}
              signedIn={signedIn}
              open={open === c.slug}
              onToggle={() => setOpen(open === c.slug ? null : c.slug)}
              act={act}
              busy={busy}
              admin={view.admin}
            />
          ))}

        {(phase === 'voting' || phase === 'counting' || phase === 'results') && (
          <>
            {phase === 'voting' && (
              <p className="poll-aside">
                Watch first, then rate. Only rate what you’ve seen: a rating here is the same as anywhere else.
              </p>
            )}
            {view.categories.map((c, i) => (
              <BallotCategory key={c.slug} poll={poll} category={c} index={i} signedIn={signedIn} admin={view.admin} act={act} />
            ))}
          </>
        )}

        <Rules poll={poll} />
      </div>
    </>
  );
}
