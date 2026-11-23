import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Still from '../components/Still';
import { Loading, SignInPrompt } from '../components/Layout';
import { useToast } from '../components/Toast';
import { useLibrary } from '../contexts/LibraryContext';
import { cleanVideoId } from '../utils/videoUtils';
import { rememberVideos } from '../lib/videoCache';
import { MOODS, moodLabel } from '../lib/moods';
import { LENGTHS, bestFit, filterSaved, sortSaved } from '../lib/saved';
import { minutesLabel, runningTime, spelled } from '../lib/format';
import { BRAND } from '../lib/brand';

const MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const MINUTES_KEY = 'matinee:minutes';
const ORDERS = [
  ['recent', 'Recently saved'],
  ['shortest', 'Shortest'],
  ['longest', 'Longest'],
  ['loved', 'Best-loved'],
];

function rememberMinutes(n) {
  try {
    localStorage.setItem(MINUTES_KEY, String(n));
  } catch {
    // A convenience only.
  }
}

function recallMinutes() {
  try {
    const n = Number(localStorage.getItem(MINUTES_KEY));
    return MINUTES.includes(n) ? n : 20;
  } catch {
    return 20;
  }
}

/** "today", "yesterday", "three days ago", "on 18 November". */
function savedWhen(iso) {
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const then = new Date(iso);
  const days = Math.round((day(new Date()) - day(then)) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${spelled(days)} days ago`;
  return `on ${then.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
}

/** Why it's on your list: you saved it, and maybe friends did too. */
function whyLine(item) {
  const saved = `You saved it ${savedWhen(item.savedAt)}`;
  if (item.friends.length === 1) return `${saved}. ${item.friends[0].split(' ')[0]} saved it too.`;
  if (item.friends.length > 1) return `${saved}. ${item.friends.map((n) => n.split(' ')[0]).slice(0, 2).join(' and ')} saved it too.`;
  return `${saved}.`;
}

/** The spare time a pick leaves, in words. */
function fitLine(seconds, minutes) {
  const spare = Math.floor((minutes * 60 - seconds) / 60);
  if (spare <= 0) return `${minutesLabel(seconds)}. A perfect fit.`;
  if (spare === 1) return `${minutesLabel(seconds)}, with a minute to spare.`;
  return `${minutesLabel(seconds)}, with ${spelled(spare)} minutes to spare.`;
}

/**
 * The whole list as a strip of film: one frame per video, as wide as it is
 * long, with hour marks underneath. Filters dim what they leave out; the
 * "Got N minutes?" pick is lit.
 */
function Reel({ items, shown, pick }) {
  const known = items.filter((v) => v.seconds);
  const total = known.reduce((n, v) => n + v.seconds, 0);
  if (known.length < 2 || total === 0) return null;
  const hours = Math.floor(total / 3600);
  const visible = new Set(shown.map((v) => v.id));
  return (
    <figure className="reel" aria-label={`${spelled(items.length)} saved, ${runningTime(total)} in all`}>
      <div className="reel__strip" role="img" aria-hidden="true">
        {known.map((v) => (
          <span
            key={v.id}
            className="reel__frame"
            data-dim={!visible.has(v.id)}
            data-pick={pick && pick.id === v.id}
            style={{ flexGrow: v.seconds }}
            title={`${v.title} · ${minutesLabel(v.seconds)}`}
          />
        ))}
      </div>
      <div className="reel__ticks" aria-hidden="true">
        <span style={{ left: 0 }}>0</span>
        {Array.from({ length: hours }, (_, i) => (
          <span key={i} style={{ left: `${(((i + 1) * 3600) / total) * 100}%` }}>
            {i + 1} h
          </span>
        ))}
      </div>
    </figure>
  );
}

function Chips({ label, options, value, onChange }) {
  return (
    <div className="filters__row" role="group" aria-label={label}>
      <span className="filters__label">{label}</span>
      <div className="chips">
        {options.map((o) => (
          <button key={o.key} type="button" className="chip" aria-pressed={value === o.key} onClick={() => onChange(value === o.key ? null : o.key)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PasteToSave({ onSaved, compact = false }) {
  const lib = useLibrary();
  const toast = useToast();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const id = cleanVideoId(value.trim());
    if (!id) {
      toast('That doesn’t look like a YouTube link.', { tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      await lib.save({ id }, 'link');
      setValue('');
      toast('Saved for later.');
      onSaved();
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`paste${compact ? ' paste--compact' : ''}`} onSubmit={submit}>
      <label htmlFor="paste" className={compact ? 'sr-only' : 'paste__label'}>
        Save something new
      </label>
      <div className="searchbar">
        <input
          id="paste"
          className="field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a YouTube link"
          autoComplete="off"
          inputMode="url"
        />
        <button type="submit" className="btn btn--ghost" disabled={busy || !value.trim()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p className="setting__desc">On Android, you can also share a video from the YouTube app straight to {BRAND.name}.</p>
    </form>
  );
}

export default function Saved() {
  const { status } = useSession();
  const lib = useLibrary();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [minutes, setMinutes] = useState(20);
  const [length, setLength] = useState(null);
  const [mood, setMood] = useState(null);
  const [order, setOrder] = useState('recent');

  useEffect(() => setMinutes(recallMinutes()), []);

  const load = useCallback(() => {
    fetch('/api/saved', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Your Saved list didn’t load. Try again in a moment.'))))
      .then((body) => {
        const list = Array.isArray(body.items) ? body.items : [];
        rememberVideos(list.map((v) => ({ id: v.id, title: v.title, channel: v.channel, duration: v.duration, publishedAt: v.publishedAt })));
        setItems(list);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  // Rated or removed elsewhere in the app: it leaves this list at once.
  const live = useMemo(() => (items || []).filter((v) => !lib.synced || lib.isSaved(v.id)), [items, lib]);
  const shown = useMemo(() => sortSaved(filterSaved(live, { length, mood }), order), [live, length, mood, order]);
  const pick = useMemo(() => bestFit(filterSaved(live, { mood }), minutes), [live, mood, minutes]);
  const shortest = useMemo(() => sortSaved(filterSaved(live, { mood }), 'shortest').find((v) => v.seconds), [live, mood]);

  if (status === 'loading') return <Loading />;
  if (status !== 'authenticated') {
    return <SignInPrompt title="Sign in to save videos." body="One list of everything you want to watch, from anywhere, sorted by the time you’ve got." />;
  }

  const total = live.reduce((n, v) => n + (v.seconds || 0), 0);
  const shownTotal = shown.reduce((n, v) => n + (v.seconds || 0), 0);
  const filtered = length || mood;

  const remove = async (item) => {
    try {
      await lib.unsave(item.id);
      toast('Taken out of Saved.', {
        action: {
          label: 'Undo',
          onClick: () => lib.save({ id: item.id, title: item.title, channel: item.channel }, item.source || 'card').catch(() => {}),
        },
      });
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const changeMinutes = (n) => {
    setMinutes(n);
    rememberMinutes(n);
  };

  return (
    <>
      <Head>
        <title>{`Saved — ${BRAND.name}`}</title>
      </Head>
      <div className="page">
        <header className="page-head">
          <h1 className="h1">Saved</h1>
          <p className="lede">Everything you want to watch, from anywhere. Rate one and it moves to your diary.</p>
          {live.length > 0 && (
            <p className="meta">
              {live.length} saved · {runningTime(total)} in all
            </p>
          )}
        </header>

        {items === null && !error && <p className="loading">One moment…</p>}
        {error && <p className="lede">{error}</p>}

        {items !== null && live.length === 0 && (
          <section className="saved-empty">
            <div className="stock" aria-hidden="true" />
            <div className="empty">
              <p className="empty__title">Nothing saved yet.</p>
              <p className="empty__body">
                Tap <em>Save</em> on any video, here or on{' '}
                <Link className="link" href="/">
                  Today
                </Link>
                , or paste a link. It all waits here, sorted by the time you’ve got.
              </p>
            </div>
            <PasteToSave onSaved={load} compact />
          </section>
        )}

        {live.length > 0 && (
          <>
            <section className="minutes" aria-live="polite">
              <h2 className="minutes__q">
                Got{' '}
                <label className="sr-only" htmlFor="minutes">
                  Minutes you have
                </label>
                <select id="minutes" className="minutes__select" value={minutes} onChange={(e) => changeMinutes(Number(e.target.value))}>
                  {MINUTES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>{' '}
                minutes{mood ? <em>, and want something {moodLabel(mood).toLowerCase()}</em> : null}?
              </h2>

              {pick ? (
                <article className="minutes__pick" key={pick.id}>
                  <Link href={`/watch/${pick.id}`} aria-label={pick.title}>
                    <Still id={pick.id} title={pick.title} size="lg" />
                  </Link>
                  <div className="minutes__text">
                    <p className="minutes__fit">{fitLine(pick.seconds, minutes)}</p>
                    <Link href={`/watch/${pick.id}`}>
                      <h3 className="feature__title">{pick.title}</h3>
                    </Link>
                    <p className="entry__by">{pick.channel}</p>
                    <p className="entry__why">
                      {pick.likely >= 8.5
                        ? 'The best-loved thing on your list that fits.'
                        : pick.friends.length
                          ? `${pick.friends[0].split(' ')[0]} saved it too.`
                          : 'The one that fits your time best.'}
                    </p>
                    <div className="feature__actions">
                      <Link href={`/watch/${pick.id}`} className="arrow-link">
                        Watch now <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              ) : (
                <p className="lede minutes__none">
                  {shortest
                    ? `Nothing fits in ${spelled(minutes)} minutes${mood ? ` that’s ${moodLabel(mood).toLowerCase()}` : ''}. The shortest is ${minutesLabel(shortest.seconds)}.`
                    : 'Nothing here has a known length yet. Lengths arrive within a day.'}
                </p>
              )}
            </section>

            <Reel items={live} shown={shown} pick={pick} />

            <div className="filters">
              <Chips label="Length" options={LENGTHS} value={length} onChange={setLength} />
              <Chips label="Mood" options={MOODS} value={mood} onChange={setMood} />
            </div>

            <div className="section__head saved-head">
              {filtered && (
                <p className="meta">
                  {shown.length} of {live.length}
                  {shownTotal > 0 ? ` · ${runningTime(shownTotal)}` : ''}
                </p>
              )}
              <div className="segmented" role="group" aria-label="Order">
                {ORDERS.map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={order === key} onClick={() => setOrder(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {shown.length === 0 ? (
              <div className="empty">
                <p className="empty__title">
                  {mood ? `Nothing ${moodLabel(mood).toLowerCase()} here yet.` : 'Nothing that long here.'}
                </p>
                <p className="empty__body">
                  {mood
                    ? 'Moods come from members’ taps after they rate, so they fill in as people watch.'
                    : 'Try another length.'}{' '}
                  <button
                    type="button"
                    className="textbtn"
                    onClick={() => {
                      setLength(null);
                      setMood(null);
                    }}
                  >
                    Show everything
                  </button>
                </p>
              </div>
            ) : (
              <div className="rows">
                {shown.map((v) => (
                  <div key={v.id} className="row saved-row">
                    <span className="saved-row__len">{v.seconds ? minutesLabel(v.seconds) : '–'}</span>
                    <Link href={`/watch/${v.id}`} aria-label={v.title}>
                      <Still id={v.id} title={v.title} size="sm" />
                    </Link>
                    <span className="row__body">
                      <Link href={`/watch/${v.id}`} className="row__title">
                        {v.title}
                      </Link>
                      <span className="row__sub">
                        {v.seconds ? <span className="saved-row__len-inline">{minutesLabel(v.seconds)} · </span> : null}
                        {v.channel}
                        {v.moodLine && <span className="muted"> · {v.moodLine}</span>}
                      </span>
                      <span className="row__why">{whyLine(v)}</span>
                    </span>
                    <span className="row__end">
                      <button type="button" className="textbtn" onClick={() => remove(v)}>
                        Remove
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {items !== null && live.length > 0 && <PasteToSave onSaved={load} />}
      </div>
    </>
  );
}
