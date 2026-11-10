import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Still from '../components/Still';
import RatingStrip from '../components/RatingStrip';
import { Loading, SignInPrompt } from '../components/Layout';
import { useToast } from '../components/Toast';
import { useLibrary } from '../contexts/LibraryContext';
import { parseGoogleTakeoutFile, validateTakeoutFile } from '../utils/googleTakeout';
import { dayOfMonth, monthLabel, plural } from '../lib/format';
import { BRAND } from '../lib/brand';

const TABS = ['rated', 'history', 'import'];
const PAGE = 30;

function RatedTab({ list }) {
  const [order, setOrder] = useState('recent');

  const months = useMemo(() => {
    const groups = [];
    for (const item of list) {
      const date = item.ratedAt ? new Date(item.ratedAt) : null;
      const key = date ? `${date.getFullYear()}-${date.getMonth()}` : 'undated';
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, label: date ? monthLabel(date) : 'Undated', items: [] };
        groups.push(group);
      }
      group.items.push({ ...item, date });
    }
    return groups;
  }, [list]);

  const byScore = useMemo(() => [...list].sort((a, b) => b.score - a.score), [list]);

  if (list.length === 0) {
    return (
      <div className="empty">
        <p className="empty__title">Nothing rated yet.</p>
        <p className="empty__body">
          Start with your{' '}
          <Link className="link" href="/diary?tab=history">
            watch history
          </Link>
          , or{' '}
          <Link className="link" href="/search">
            search
          </Link>{' '}
          for something you’ve seen.
        </p>
      </div>
    );
  }

  const row = (item, lead) => (
    <Link key={item.video.id} href={`/watch/${item.video.id}`} className="row diary-row">
      <span className="row__no">{lead}</span>
      <Still id={item.video.id} title={item.video.title} size="sm" />
      <span className="row__body">
        <span className="row__title">{item.video.title || 'Untitled video'}</span>
        <span className="row__sub">{item.video.channel}</span>
      </span>
      <span className="row__end">
        <span className="row__score">{item.score}</span>
      </span>
    </Link>
  );

  return (
    <>
      <div className="segmented" role="group" aria-label="Order" style={{ marginTop: 'var(--s-5)' }}>
        <button type="button" aria-pressed={order === 'recent'} onClick={() => setOrder('recent')}>
          By date
        </button>
        <button type="button" aria-pressed={order === 'score'} onClick={() => setOrder('score')}>
          By rating
        </button>
      </div>

      {order === 'recent' ? (
        months.map((m) => (
          <div key={m.key} className="month">
            <h2 className="month__name">
              {m.label}
              <small>{plural(m.items.length, 'rating')}</small>
            </h2>
            <div className="rows">{m.items.map((item) => row(item, item.date ? dayOfMonth(item.date) : '—'))}</div>
          </div>
        ))
      ) : (
        <div className="rows" style={{ marginTop: 'var(--s-6)' }}>
          {byScore.map((item, i) => row(item, String(i + 1).padStart(2, '0')))}
        </div>
      )}
    </>
  );
}

function HistoryTab() {
  const lib = useLibrary();
  const toast = useToast();
  const [order, setOrder] = useState('watched');
  const [limit, setLimit] = useState(PAGE);
  const [confirmAll, setConfirmAll] = useState(false);

  const items = useMemo(() => {
    const list = [...lib.history];
    if (order === 'watched') {
      list.sort((a, b) => (b.watchCount || 1) - (a.watchCount || 1) || String(b.watchedAt).localeCompare(String(a.watchedAt)));
    } else {
      list.sort((a, b) => String(b.watchedAt).localeCompare(String(a.watchedAt)));
    }
    return list;
  }, [lib.history, order]);

  if (items.length === 0) {
    return (
      <div className="empty">
        <p className="empty__title">Nothing waiting here.</p>
        <p className="empty__body">
          {lib.videos.some((v) => v.watchedAt)
            ? 'You’ve rated or skipped everything you imported.'
            : 'Import your watch history and the videos you’ve seen will wait here to be rated.'}{' '}
          <Link className="link" href="/diary?tab=import">
            Import history
          </Link>
          .
        </p>
      </div>
    );
  }

  const rate = async (video, score) => {
    try {
      await lib.rate(video, score);
      toast(`Rated ${score}.`);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const skip = (video) => {
    lib.ignore(video.id);
    toast('Skipped.', { action: { label: 'Undo', onClick: () => lib.ignore(video.id, false) } });
  };

  const skipAll = () => {
    const ids = items.map((v) => v.id);
    lib.ignore(ids);
    setConfirmAll(false);
    toast(`Skipped ${plural(ids.length, 'video')}.`, { action: { label: 'Undo', onClick: () => lib.ignore(ids, false) } });
  };

  return (
    <>
      <div className="section__head" style={{ marginTop: 'var(--s-5)', marginBottom: 'var(--s-4)' }}>
        <div className="segmented" role="group" aria-label="Order">
          <button type="button" aria-pressed={order === 'watched'} onClick={() => setOrder('watched')}>
            Most watched
          </button>
          <button type="button" aria-pressed={order === 'recent'} onClick={() => setOrder('recent')}>
            Most recent
          </button>
        </div>
        {confirmAll ? (
          <span className="banner__actions">
            <span className="muted">Skip all {items.length}?</span>
            <button type="button" className="textbtn textbtn--danger" onClick={skipAll}>
              Yes, skip them
            </button>
            <button type="button" className="textbtn" onClick={() => setConfirmAll(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" className="textbtn" onClick={() => setConfirmAll(true)}>
            Skip all
          </button>
        )}
      </div>

      <div className="rows">
        {items.slice(0, limit).map((v) => (
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
              <RatingStrip value={null} onChange={(score) => rate(v, score)} size="sm" label={`Rate ${v.title}`} />
              <button type="button" className="textbtn" onClick={() => skip(v)}>
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length > limit && (
        <div style={{ paddingTop: 'var(--s-5)' }}>
          <button type="button" className="btn btn--ghost" onClick={() => setLimit((n) => n + PAGE)}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}

function ImportTab({ onDone }) {
  const lib = useLibrary();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const check = validateTakeoutFile(file);
    if (!check.valid) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = await parseGoogleTakeoutFile(file);
      const result = lib.importHistory(parsed.videos);
      if (!result.ok) throw new Error('Your browser ran out of space for this history.');
      setMessage(
        `Read ${plural(parsed.videos.length, 'watch', 'watches')} of ${plural(result.unique, 'video')}; ${result.added} new.` +
          (result.truncated ? ' We kept the most recent ones that fit in your browser.' : '')
      );
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setting-group" style={{ borderTop: 0 }}>
      <div className="setting-group__intro">
        <h2 className="h3">Import your watch history</h2>
        <p className="setting__desc">
          Your file is read here, in your browser, and never uploaded. Only the videos you rate are saved to your
          account.
        </p>
      </div>
      <div className="stack">
        <ol className="steps" style={{ gridTemplateColumns: '1fr' }}>
          <li>
            <p>
              Go to{' '}
              <a className="link" href="https://takeout.google.com" target="_blank" rel="noopener noreferrer">
                Google Takeout
              </a>{' '}
              and choose only <em>YouTube and YouTube Music</em>.
            </p>
          </li>
          <li>
            <p>Under the YouTube options, keep <em>history</em> and set the format to JSON.</p>
          </li>
          <li>
            <p>Download the archive and find <em>watch-history.json</em> inside it.</p>
          </li>
        </ol>
        <label className="dropzone">
          <input type="file" accept=".json,.html,application/json" onChange={onFile} disabled={busy} />
          <span className="h3">{busy ? 'Reading your history…' : 'Choose watch-history.json'}</span>
          <span className="setting__desc">or drop it here</span>
        </label>
        {message && <p className="note">{message}</p>}
        {error && <p className="lede">{error}</p>}
      </div>
    </div>
  );
}

export default function Diary() {
  const router = useRouter();
  const { status } = useSession();
  const lib = useLibrary();
  const tab = TABS.includes(router.query.tab) ? router.query.tab : 'rated';

  if (status === 'loading' || !lib.ready) return <Loading />;
  if (status !== 'authenticated') {
    return <SignInPrompt title="Sign in to keep a diary." body="Every video you rate, kept by the date you watched it." />;
  }

  const go = (next) => router.replace({ pathname: '/diary', query: next === 'rated' ? {} : { tab: next } }, undefined, { shallow: true });

  return (
    <>
      <Head>
        <title>{`Diary — ${BRAND.name}`}</title>
      </Head>
      <div className="page">
        <header className="page-head">
          <h1 className="h1">Diary</h1>
          <p className="lede">Everything you’ve rated, kept by the date you rated it.</p>
        </header>

        <div className="tabs" role="tablist" aria-label="Diary">
          <button type="button" role="tab" className="tab" aria-selected={tab === 'rated'} onClick={() => go('rated')}>
            Rated<span className="tab__count">{lib.ratedCount}</span>
          </button>
          <button type="button" role="tab" className="tab" aria-selected={tab === 'history'} onClick={() => go('history')}>
            From your history<span className="tab__count">{lib.history.length}</span>
          </button>
          <button type="button" role="tab" className="tab" aria-selected={tab === 'import'} onClick={() => go('import')}>
            Import
          </button>
        </div>

        {tab === 'rated' && <RatedTab list={lib.ratedList} />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'import' && <ImportTab onDone={() => go('history')} />}
      </div>
    </>
  );
}
