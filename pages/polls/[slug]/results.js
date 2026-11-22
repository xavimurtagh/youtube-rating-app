import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ResultsCategory } from '../../../components/Poll';
import { useToast } from '../../../components/Toast';
import { getUser } from '../../../lib/auth';
import { resultsView } from '../../../lib/pollView';
import { pollConfig, pollDay, pollName } from '../../../lib/polls';
import { BRAND } from '../../../lib/brand';

/**
 * The results: public, and rendered on the server so links to it preview
 * properly. If the database can't be reached while rendering, the browser
 * asks again.
 */
export async function getServerSideProps({ params, req, res }) {
  const slug = String(params.slug);
  if (!pollConfig(slug)) return { notFound: true };
  try {
    const view = await resultsView(slug, await getUser(req, res));
    const shareable = view && view.ready && !view.preview;
    res.setHeader('Cache-Control', shareable ? 'public, s-maxage=300, stale-while-revalidate=3600' : 'private, no-store');
    return { props: { slug, initial: JSON.parse(JSON.stringify(view)) } };
  } catch (error) {
    console.error('Poll results page error:', error?.message || error);
    return { props: { slug, initial: null } };
  }
}

export default function Results({ slug, initial }) {
  const toast = useToast();
  const config = pollConfig(slug);
  const [view, setView] = useState(initial);

  useEffect(() => {
    if (initial) return;
    fetch(`/api/polls/${slug}/results`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => v && setView(v))
      .catch(() => {});
  }, [slug, initial]);

  const name = pollName(BRAND.name);
  const share = async () => {
    const url = `${window.location.origin}/polls/${slug}/results`;
    try {
      if (navigator.share) await navigator.share({ title: `${name} ${config.year}: the results`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied.');
      }
    } catch {
      // Cancelled.
    }
  };

  const head = (
    <Head>
      <title>{`The results — ${name} ${config.year}`}</title>
      <meta name="description" content={`${config.title}, as members rated it: the winners in five categories.`} />
      <meta property="og:title" content={`${name} ${config.year}: the results`} />
      <meta property="og:description" content="The best of the year, chosen by members' ratings. Never by views or likes." />
    </Head>
  );

  if (!view) {
    return (
      <>
        {head}
        <div className="page">
          <p className="loading">One moment…</p>
        </div>
      </>
    );
  }

  if (!view.ready) {
    return (
      <>
        {head}
        <div className="page">
          <header className="poll-hero">
            <p className="dateline">{name} · The results</p>
            <h1 className="display">
              Sealed until <em>{pollDay(view.poll.publishedAt)}</em>
            </h1>
            <p className="lede">Nobody sees the scores before then, us included, so nobody votes with the crowd.</p>
            <Link href={`/polls/${slug}`} className="arrow-link">
              Back to the poll <span aria-hidden="true">→</span>
            </Link>
          </header>
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <div className="page">
        <header className="poll-hero poll-hero--results">
          <span className="poll-hero__year" aria-hidden="true">
            ’{String(view.poll.year).slice(2)}
          </span>
          <p className="dateline">
            {name} · The results{view.preview ? ' · Preview for admins' : ''}
          </p>
          <h1 className="display">
            The best of YouTube in <em>{view.poll.year}</em>
          </h1>
          <p className="lede">
            Chosen by members, from {view.countedRatings.toLocaleString('en-GB')} counted ratings. Members’ ratings
            only, never YouTube’s views or likes.
          </p>
          <div className="feature__actions">
            <button type="button" className="btn" onClick={share}>
              Share the results
            </button>
            <Link href={`/polls/${slug}`} className="arrow-link">
              The full ballot <span aria-hidden="true">→</span>
            </Link>
          </div>
        </header>

        {view.categories.map((c, i) => (
          <ResultsCategory key={c.slug} category={c} index={i} />
        ))}

        <p className="poll-aside">
          Ranked by a weighted average of counted ratings, so a few perfect scores can’t beat many great ones. A
          nominee needed five counted ratings to be ranked. The number after each score is how many there were.
        </p>
      </div>
    </>
  );
}
