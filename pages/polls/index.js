import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { PhaseLine } from '../../components/Poll';
import { POLLS, phaseOf, pollDay, pollName } from '../../lib/polls';
import { BRAND } from '../../lib/brand';

const WORDS = {
  upcoming: (p) => `Nominations open on ${pollDay(p.opensAt)}.`,
  nominations: (p) => `Nominations are open until ${pollDay(p.votingAt, { lastDay: true })}.`,
  voting: (p) => `Voting is open until ${pollDay(p.closesAt, { lastDay: true })}.`,
  counting: (p) => `Voting has closed. Results on ${pollDay(p.publishedAt)}.`,
  results: () => 'The results are in.',
};

/** Every poll, newest first. The year-end poll for now; monthly charts later. */
export default function Polls() {
  // The phase depends on today's date, so it's worked out in the browser.
  const [now, setNow] = useState(null);
  useEffect(() => setNow(Date.now()), []);
  const polls = [...POLLS].sort((a, b) => b.year - a.year);
  const name = pollName(BRAND.name);

  return (
    <>
      <Head>
        <title>{`Polls — ${BRAND.name}`}</title>
      </Head>
      <div className="page">
        <header className="page-head">
          <h1 className="h1">Polls</h1>
          <p className="lede">Members choose the best of the year. Every vote is a rating, and the crowd stays sealed until the end.</p>
        </header>
        {polls.map((p) => {
          const phase = now ? phaseOf(p, new Date(now)) : null;
          return (
            <Link key={p.slug} href={phase === 'results' ? `/polls/${p.slug}/results` : `/polls/${p.slug}`} className="poll-card">
              <span className="poll-card__year" aria-hidden="true">
                ’{String(p.year).slice(2)}
              </span>
              <span className="dateline">{name}</span>
              <span className="poll-card__title">{p.title}</span>
              {phase && <span className="note">{WORDS[phase](p)}</span>}
              {now && <PhaseLine poll={p} now={now} />}
            </Link>
          );
        })}
      </div>
    </>
  );
}
