import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Still from '../components/Still';
import { Loading, SignInPrompt } from '../components/Layout';
import { useLibrary } from '../contexts/LibraryContext';
import { cleanVideoId } from '../utils/videoUtils';
import { formatDuration } from '../lib/format';
import { BRAND } from '../lib/brand';

/** The first YouTube video in whatever was shared (apps put the link in different fields). */
function sharedVideoId(query) {
  for (const key of ['url', 'text', 'title']) {
    const raw = typeof query[key] === 'string' ? query[key] : '';
    const link = raw.match(/https?:\/\/\S+/)?.[0] || raw;
    const shorts = link.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    const id = shorts ? shorts[1] : cleanVideoId(link);
    if (id) return id;
  }
  return null;
}

/**
 * Where "Share → [app]" lands on Android (the web app's share target). From
 * the installed app it saves straight away; opened any other way, it asks
 * first, so a link someone sends you can't add things to your list.
 */
export default function Share() {
  const router = useRouter();
  const { status } = useSession();
  const lib = useLibrary();
  const [video, setVideo] = useState(null);
  const [state, setState] = useState('idle'); // idle | saving | saved | error
  const [message, setMessage] = useState(null);
  const tried = useRef(false);

  const id = useMemo(() => (router.isReady ? sharedVideoId(router.query) : null), [router.isReady, router.query]);

  useEffect(() => {
    if (!id) return;
    fetch('/api/video-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoIds: [id] }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        const v = b && b.videos && b.videos[0];
        if (v && v.found !== false) setVideo(v);
      })
      .catch(() => {});
  }, [id]);

  const save = async () => {
    setState('saving');
    try {
      await lib.save({ id, ...(video || {}) }, 'share');
      setState('saved');
    } catch (e) {
      setMessage(e.message);
      setState('error');
    }
  };

  useEffect(() => {
    if (!id || status !== 'authenticated' || !lib.synced || tried.current) return;
    tried.current = true;
    if (lib.isSaved(id)) {
      setState('saved');
      return;
    }
    const installed = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    if (installed) save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status, lib.synced]);

  if (!router.isReady || status === 'loading') return <Loading />;

  if (!id) {
    return (
      <div className="page page--narrow">
        <div className="empty" style={{ paddingTop: 'var(--s-9)' }}>
          <h1 className="h1">That wasn’t a YouTube video.</h1>
          <p className="lede">Share a video from the YouTube app, or paste its link into Saved.</p>
          <Link href="/saved" className="arrow-link">
            Saved <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <SignInPrompt title="Sign in to save it." body="Then anything you share here waits in Saved, sorted by the time you’ve got." />;
  }

  const title = (video && video.title) || 'A video from YouTube';
  const heading =
    state === 'saved' ? 'Saved for later.' : state === 'saving' ? 'Saving…' : state === 'error' ? 'That didn’t save.' : 'Save this for later?';

  return (
    <>
      <Head>
        <title>{`Share — ${BRAND.name}`}</title>
      </Head>
      <div className="page page--narrow">
        <header className="page-head">
          <p className="dateline">Shared to {BRAND.name}</p>
          <h1 className="h1">{heading}</h1>
        </header>
        <div className="share">
          <Link href={`/watch/${id}`} aria-label={title}>
            <Still id={id} title={title} size="lg" />
          </Link>
          <div className="stack">
            <p className="h3">{title}</p>
            {video && <p className="entry__by">{[video.channel, formatDuration(video.duration)].filter(Boolean).join(' · ')}</p>}
            {state === 'error' && <p className="note">{message}</p>}
            <div className="feature__actions">
              {state === 'saved' ? (
                <>
                  <Link href="/saved" className="btn">
                    See Saved
                  </Link>
                  <Link href={`/watch/${id}`} className="arrow-link">
                    Watch now <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : (
                <>
                  <button type="button" className="btn" onClick={save} disabled={state === 'saving'}>
                    {state === 'saving' ? 'Saving…' : 'Save it'}
                  </button>
                  <Link href={`/watch/${id}`} className="arrow-link">
                    Watch now instead <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
