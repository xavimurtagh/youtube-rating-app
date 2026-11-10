import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLibrary } from '../contexts/LibraryContext';
import { useToast } from './Toast';
import { FeatureEntry, CardEntry, RowEntry, FriendEntry } from './Entry';
import RatingStrip, { Meter } from './RatingStrip';
import Still from './Still';
import { dateline, describeReason, plural, spelled } from '../lib/format';
import { rememberProgramme, rememberVideos } from '../lib/videoCache';

const UNLOCK = 10;
const LOVED = 8;

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

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

/** For new members: rate what you've already watched, one tap each. */
function QuickRate({ items, total, onRate, onSkip }) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="h2">Rate a few you’ve seen</h2>
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

function StartHere() {
  return (
    <section className="section">
      <div className="doors">
        <Link href="/diary?tab=import" className="door">
          <span className="door__title">Import your watch history</span>
          <span className="prose">From Google Takeout. It stays in your browser.</span>
        </Link>
        <Link href="/search" className="door">
          <span className="door__title">Find a video you’ve seen</span>
          <span className="prose">Search for it, or paste a YouTube link.</span>
        </Link>
      </div>
    </section>
  );
}

function Friends({ items }) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="h2">Friends are loving</h2>
        {items.length > 0 && (
          <Link href="/people" className="arrow-link">
            People <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      {items.length > 0 ? (
        <div className="bill bill--four">
          {items.map((item) => (
            <FriendEntry key={item.video.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="prose">
          When people you follow give something an {LOVED} or higher, it shows up here.{' '}
          <Link className="link" href="/search?type=people">
            Find people to follow
          </Link>
          .
        </p>
      )}
    </section>
  );
}

function Picks({ title, recs }) {
  if (recs.length === 0) return null;
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="h2">{title}</h2>
      </div>
      <div className="bill bill--four">
        {recs.map((rec) => (
          <CardEntry key={rec.video.id} rec={rec} />
        ))}
      </div>
    </section>
  );
}

export default function Today() {
  const lib = useLibrary();
  const toast = useToast();
  const [today, setToday] = useState('');
  const [hello, setHello] = useState('Hello');
  const [programme, setProgramme] = useState({ state: 'loading', recs: [] });
  const [community, setCommunity] = useState([]);
  const [activity, setActivity] = useState(null);
  const [showMore, setShowMore] = useState(false);

  const unlocked = lib.ratedCount >= UNLOCK;
  const firstName = ((lib.me && lib.me.name) || '').trim().split(/\s+/)[0];

  useEffect(() => {
    setToday(dateline());
    setHello(greeting());
  }, []);

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
          const recs = (body.recommendations || []).slice(0, 12);
          rememberVideos(recs.map((r) => ({ ...r.video, why: describeReason(r) })));
          rememberProgramme(recs.map((r) => r.video.id));
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
      .catch(() => setActivity([]));
  }, [lib.synced]);

  const history = useMemo(
    () =>
      [...lib.history]
        .sort((a, b) => (b.watchCount || 1) - (a.watchCount || 1) || String(b.watchedAt).localeCompare(String(a.watchedAt)))
        .slice(0, 5),
    [lib.history]
  );

  const communityRecs = useMemo(
    () =>
      community.slice(0, 4).map((p) => ({
        video: p.video,
        avgRating: p.avgRating,
        recommenderCount: p.ratingCount,
        source: 'popular',
        because: { kind: 'community' },
      })),
    [community]
  );

  // The latest things friends rated highly, newest first, skipping anything
  // you've rated or that's already among today's picks.
  const friends = useMemo(() => {
    const seen = new Set(programme.recs.map((r) => r.video.id));
    const out = [];
    for (const a of activity || []) {
      const data = a.data && typeof a.data === 'object' ? a.data : {};
      const score = Number(data.score);
      if (a.type !== 'rating' || !(score >= LOVED) || seen.has(a.videoId) || lib.ratingOf(a.videoId)) continue;
      seen.add(a.videoId);
      out.push({
        video: { id: a.videoId, title: data.title || 'Untitled video', channel: data.channel || '' },
        name: (a.user && a.user.name) || 'Someone',
        avatar: a.user && a.user.avatar,
        score,
      });
      if (out.length === 4) break;
    }
    return out;
  }, [activity, lib, programme.recs]);

  const rate = async (video, score) => {
    try {
      await lib.rate(video, score);
      const left = UNLOCK - (lib.ratedCount + 1);
      toast(left > 0 ? `Rated ${score}. ${spelled(left, { capital: true })} to go.` : `Rated ${score}. Your picks are ready.`);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const skip = (video) => {
    lib.ignore(video.id);
    toast('Skipped.', { action: { label: 'Undo', onClick: () => lib.ignore(video.id, false) } });
  };

  const { state, recs } = programme;
  const waiting = !lib.synced || state === 'loading';
  const [feature, ...rest] = recs;
  const also = rest.slice(0, 4);
  const more = rest.slice(4);
  const hi = `${hello}${firstName ? `, ${firstName}` : ''}.`;

  if (state === 'locked' && !waiting) {
    const left = Math.max(0, UNLOCK - lib.ratedCount);
    return (
      <div className="page">
        {lib.legacyCount > 0 && <LegacyBanner />}
        <header className="page-head">
          <p className="dateline">{today || ' '}</p>
          <h1 className="h1">{firstName ? `Welcome, ${firstName}.` : 'Welcome.'}</h1>
          <p className="lede">Rate a few videos you’ve already seen, and your picks start here.</p>
          <div className="progress">
            <Meter value={Math.min(lib.ratedCount, UNLOCK)} label={`${lib.ratedCount} of ${UNLOCK} ratings`} />
            <span className="meta">{left === 1 ? 'One to go' : `${spelled(left, { capital: true })} to go`}</span>
          </div>
        </header>

        {history.length > 0 ? (
          <QuickRate items={history} total={lib.history.length} onRate={rate} onSkip={skip} />
        ) : (
          <StartHere />
        )}

        <Picks title="Or start with these" recs={communityRecs} />
        {activity && <Friends items={friends} />}
      </div>
    );
  }

  let lede = null;
  if (waiting) lede = <p className="lede note">Choosing today’s picks…</p>;
  else if (state === 'off')
    lede = (
      <p className="lede">
        Personal picks are off. You can turn them back on in{' '}
        <Link className="link" href="/settings">
          Settings
        </Link>
        .
      </p>
    );
  else if (state === 'error') lede = <p className="lede">We couldn’t load today’s picks. Try again in a moment.</p>;
  else if (recs.length === 0) lede = <p className="lede">Nothing new for you today. Here’s what people are loving.</p>;
  else {
    const n = Math.min(recs.length, 5);
    lede = <p className="lede">{n === 1 ? 'One pick for today.' : `${spelled(n, { capital: true })} picks for today.`}</p>;
  }

  const fallback = !waiting && (state !== 'ready' || recs.length === 0);
  const unrated = lib.history.length;

  return (
    <div className="page">
      {lib.legacyCount > 0 && <LegacyBanner />}

      <header className="page-head">
        <p className="dateline">{today || ' '}</p>
        <h1 className="h1">{hi}</h1>
        {lede}
      </header>

      {feature && <FeatureEntry rec={feature} />}
      <Picks title="Also for you" recs={also} />

      {more.length > 0 && (
        <div className="more">
          {showMore ? (
            <div className="rows">
              {more.map((rec) => (
                <RowEntry key={rec.video.id} rec={rec} />
              ))}
            </div>
          ) : (
            <button type="button" className="arrow-link" onClick={() => setShowMore(true)}>
              {more.length === 1 ? 'One more pick' : `${spelled(more.length, { capital: true })} more picks`}{' '}
              <span aria-hidden="true">↓</span>
            </button>
          )}
        </div>
      )}

      {fallback && <Picks title="Popular here" recs={communityRecs} />}

      {activity && <Friends items={friends} />}

      {!waiting && (
        <footer className="today-end">
          {unlocked && unrated > 0 && (
            <p>
              You’ve watched {plural(unrated, 'video')} you haven’t rated.{' '}
              <Link className="link" href="/diary?tab=history">
                Rate {unrated === 1 ? 'it' : 'them'}
              </Link>
              .
            </p>
          )}
          {recs.length > 0 && (
            <p className="note">
              That’s today. New picks tomorrow.{' '}
              <Link className="link" href="/how-it-works">
                How these are chosen
              </Link>
              .
            </p>
          )}
        </footer>
      )}
    </div>
  );
}
