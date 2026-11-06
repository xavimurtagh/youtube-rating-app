import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLibrary } from '../contexts/LibraryContext';
import { useToast } from './Toast';
import { FeatureEntry, CardEntry, RowEntry } from './Entry';
import RatingStrip, { Meter } from './RatingStrip';
import Still from './Still';
import Avatar from './Avatar';
import { dateline, describeReason, plural, relativeTime, spelled, withArticle } from '../lib/format';
import { rememberVideos } from '../lib/videoCache';

const UNLOCK = 10;

function LegacyBanner() {
  const lib = useLibrary();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const n = lib.legacyCount;

  const add = async () => {
    setBusy(true);
    const result = await lib.migrateLegacy();
    setBusy(false);
    toast(`Added ${result.saved} of ${plural(result.total, 'rating')} to your account.`);
  };

  return (
    <div className="banner">
      <span>
        We found {plural(n, 'rating')} saved only in this browser. Add {n === 1 ? 'it' : 'them'} to your account?
      </span>
      <span className="banner__actions">
        <button type="button" className="btn btn--small" onClick={add} disabled={busy}>
          {busy ? 'Adding…' : 'Add them'}
        </button>
        <button type="button" className="textbtn" onClick={lib.dismissLegacy}>
          Not now
        </button>
      </span>
    </div>
  );
}

function HistoryQuickRate({ items, total, onRate, onSkip }) {
  return (
    <section className="section">
      <div className="section__head">
        <div className="stack">
          <h2 className="h2">From your watch history</h2>
          <p className="prose">You’ve seen these. Rating them teaches your programme what you like.</p>
        </div>
        {total > items.length && (
          <Link href="/diary?tab=history" className="arrow-link">
            All {total} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <div className="rows">
        {items.map((v) => (
          <div key={v.id} className="row row--compact">
            <Link href={`/watch/${v.id}`} aria-label={v.title}>
              <Still id={v.id} title={v.title} size="sm" />
            </Link>
            <div className="row__body">
              <Link href={`/watch/${v.id}`} className="row__title">
                {v.title}
              </Link>
              <span className="row__sub">
                {v.channel}
                {v.watchCount > 1 && <span className="muted"> · watched {v.watchCount} times</span>}
              </span>
            </div>
            <div className="row__end">
              <RatingStrip value={null} onChange={(score) => onRate(v, score)} size="sm" label={`Rate ${v.title}`} />
              <button type="button" className="textbtn" onClick={() => onSkip(v)}>
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Activity({ items }) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="h2">From people you follow</h2>
        <Link href="/people" className="arrow-link">
          People <span aria-hidden="true">→</span>
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="prose">When people you follow rate something, it shows up here.</p>
      ) : (
        <div className="rows">
          {items.slice(0, 8).map((a) => {
            const score = a.data && typeof a.data === 'object' ? a.data.score : a.data;
            const title = (a.data && a.data.title) || 'a video';
            return (
              <div key={a.id} className="activity">
                <Avatar name={a.user?.name} src={a.user?.avatar} />
                <p className="activity__line">
                  <strong>{a.user?.name || 'Someone'}</strong> gave{' '}
                  <Link
                    href={`/watch/${a.videoId}`}
                    onClick={() => rememberVideos([{ id: a.videoId, title: a.data?.title, channel: a.data?.channel }])}
                  >
                    {title}
                  </Link>{' '}
                  {score != null ? withArticle(score) : 'a rating'}.
                </p>
                <span className="meta">{relativeTime(a.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function Today() {
  const lib = useLibrary();
  const toast = useToast();
  const [today, setToday] = useState('');
  const [programme, setProgramme] = useState({ state: 'loading', recs: [] });
  const [community, setCommunity] = useState([]);
  const [activity, setActivity] = useState([]);

  const unlocked = lib.ratedCount >= UNLOCK;

  useEffect(() => setToday(dateline()), []);

  useEffect(() => {
    if (!lib.synced) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/recommendations', { credentials: 'include' });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 400) setProgramme({ state: 'locked', recs: [] });
        else if (!res.ok) setProgramme({ state: 'error', recs: [] });
        else if (body.personalizationDisabled) setProgramme({ state: 'off', recs: [] });
        else {
          const recs = body.recommendations || [];
          rememberVideos(recs.map((r) => ({ ...r.video, why: describeReason(r) })));
          setProgramme({ state: 'ready', recs });
        }
      } catch {
        if (!cancelled) setProgramme({ state: 'error', recs: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lib.synced, unlocked]);

  useEffect(() => {
    if (!lib.synced) return;
    fetch('/api/community', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { picks: [] }))
      .then((b) => setCommunity(b.picks || []))
      .catch(() => {});
    fetch('/api/feed', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((a) => setActivity(Array.isArray(a) ? a : []))
      .catch(() => {});
  }, [lib.synced]);

  const history = useMemo(
    () =>
      [...lib.history]
        .sort((a, b) => (b.watchCount || 1) - (a.watchCount || 1) || String(b.watchedAt).localeCompare(String(a.watchedAt)))
        .slice(0, unlocked ? 5 : 8),
    [lib.history, unlocked]
  );

  const communityRecs = useMemo(
    () =>
      community.map((p) => ({
        video: p.video,
        avgRating: p.avgRating,
        recommenderCount: p.ratingCount,
        source: 'popular',
        because: { kind: 'community' },
      })),
    [community]
  );

  const rate = async (video, score) => {
    try {
      await lib.rate(video, score);
      const left = UNLOCK - (lib.ratedCount + 1);
      toast(left > 0 ? `Rated ${score}. ${spelled(left, { capital: true })} to go.` : `Rated ${score}.`);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const skip = (video) => {
    lib.ignore(video.id);
    toast('Skipped.', { action: { label: 'Undo', onClick: () => lib.ignore(video.id, false) } });
  };

  const recs = programme.recs;
  const [feature, ...rest] = recs;
  const also = rest.slice(0, 4);
  const more = rest.slice(4, 11);
  const waiting = !lib.synced || programme.state === 'loading';

  let headline = <h1 className="display">Now showing</h1>;
  let lede = null;
  if (waiting) {
    lede = <p className="lede note">Choosing today’s programme…</p>;
  } else if (programme.state === 'locked') {
    headline = <h1 className="h1">Your programme starts at ten ratings.</h1>;
    lede = (
      <div className="stack">
        <Meter value={Math.min(lib.ratedCount, UNLOCK)} label={`${lib.ratedCount} of ${UNLOCK} ratings`} />
        <p className="lede">
          {spelled(Math.max(0, UNLOCK - lib.ratedCount), { capital: true })} to go. Start with videos you’ve already seen.
        </p>
      </div>
    );
  } else if (programme.state === 'off') {
    headline = <h1 className="h1">Personal picks are switched off.</h1>;
    lede = (
      <p className="lede">
        You’ve turned off personalised recommendations. You can switch them back on in{' '}
        <Link className="link" href="/settings">
          Settings
        </Link>
        .
      </p>
    );
  } else if (programme.state === 'error') {
    lede = <p className="lede">We couldn’t load today’s programme. Try again in a moment.</p>;
  } else if (recs.length === 0) {
    lede = <p className="lede">Nothing new to show today. As more people rate, your programme fills in.</p>;
  } else {
    lede = (
      <p className="lede">
        {spelled(Math.min(recs.length, 12), { capital: true })} videos chosen for you today, each with the reason it’s here.
      </p>
    );
  }

  const showCommunity = communityRecs.length > 0 && (programme.state !== 'ready' || recs.length < 6);

  return (
    <div className="page">
      {lib.legacyCount > 0 && <LegacyBanner />}

      <header className="page-head">
        <p className="dateline">{today || ' '}</p>
        {headline}
        {lede}
      </header>

      {!unlocked && history.length > 0 && (
        <HistoryQuickRate items={history} total={lib.history.length} onRate={rate} onSkip={skip} />
      )}

      {!unlocked && lib.synced && history.length === 0 && (
        <section className="section">
          <div className="doors">
            <Link href="/diary?tab=import" className="door">
              <span className="label">Fastest</span>
              <span className="door__title">Import your YouTube history</span>
              <span className="prose">Bring in what you’ve watched from Google Takeout. It stays in your browser.</span>
            </Link>
            <Link href="/search" className="door">
              <span className="label">Or</span>
              <span className="door__title">Search for something you’ve seen</span>
              <span className="prose">Find a video you remember, watch a little, and rate it.</span>
            </Link>
          </div>
        </section>
      )}

      {feature && <FeatureEntry rec={feature} n={1} />}

      {also.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="h2">Also showing</h2>
          </div>
          <div className="bill">
            {also.map((rec, i) => (
              <CardEntry key={rec.video.id} rec={rec} n={i + 2} />
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="h2">The rest of the bill</h2>
          </div>
          <div className="rows">
            {more.map((rec, i) => (
              <RowEntry key={rec.video.id} rec={rec} n={i + 6} />
            ))}
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <p className="note" style={{ padding: 'var(--s-6) 0 0' }}>
          That’s today’s programme. Rate what you watch and tomorrow’s will be sharper.{' '}
          <Link className="link" href="/how-it-works">
            How these were chosen
          </Link>
          .
        </p>
      )}

      {showCommunity && (
        <section className="section">
          <div className="section__head">
            <div className="stack">
              <h2 className="h2">Community favourites</h2>
              <p className="prose">The best-rated videos here, while we learn your taste.</p>
            </div>
          </div>
          <div className="bill bill--three">
            {communityRecs.slice(0, 6).map((rec, i) => (
              <CardEntry key={rec.video.id} rec={rec} n={i + 1} />
            ))}
          </div>
        </section>
      )}

      {unlocked && history.length > 0 && (
        <HistoryQuickRate items={history} total={lib.history.length} onRate={rate} onSkip={skip} />
      )}

      {lib.synced && <Activity items={activity} />}
    </div>
  );
}
