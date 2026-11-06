import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import Player from '../../components/Player';
import RatingStrip from '../../components/RatingStrip';
import Score, { Histogram } from '../../components/Score';
import { Loading } from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { useLibrary } from '../../contexts/LibraryContext';
import { recallVideo, rememberVideos } from '../../lib/videoCache';
import { formatDuration, plural, withArticle, yearOf } from '../../lib/format';
import { BRAND } from '../../lib/brand';

const VALID_ID = /^[a-zA-Z0-9_-]{11}$/;

export default function Watch() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : null;
  const valid = !!id && VALID_ID.test(id);
  const { status } = useSession();
  const lib = useLibrary();
  const toast = useToast();

  const [details, setDetails] = useState(null);
  const [cached, setCached] = useState(null);
  const [stats, setStats] = useState(null);
  const [ended, setEnded] = useState(false);
  const [favourite, setFavourite] = useState(null);
  const ratingRef = useRef(null);

  useEffect(() => {
    setEnded(false);
    setDetails(null);
    setStats(null);
    setCached(valid ? recallVideo(id) : null);
  }, [id, valid]);

  const loadStats = useCallback(() => {
    if (!valid) return;
    fetch(`/api/video/${id}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setStats(s))
      .catch(() => {});
  }, [id, valid]);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    fetch('/api/video-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoIds: [id] }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const v = body && body.videos && body.videos[0];
        if (!cancelled && v && v.found !== false) {
          setDetails(v);
          rememberVideos([v]);
        }
      })
      .catch(() => {});
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [id, valid, loadStats]);

  useEffect(() => {
    if (!valid || status !== 'authenticated') return;
    fetch('/api/favorites', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setFavourite(Array.isArray(list) && list.some((f) => f.id === id || f.videoId === id)))
      .catch(() => setFavourite(null));
  }, [id, valid, status]);

  const onEnded = useCallback(() => {
    setEnded(true);
    const panel = ratingRef.current;
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const cell = panel.querySelector('[role="radio"][tabindex="0"]');
      if (cell) setTimeout(() => cell.focus({ preventScroll: true }), 400);
    }
  }, []);

  if (!router.isReady) return <Loading />;

  if (!valid) {
    return (
      <div className="page">
        <div className="empty" style={{ paddingTop: 'var(--s-9)' }}>
          <h1 className="h1">That isn’t a video we can show.</h1>
          <p className="lede">The link may be incomplete. Try searching for it instead.</p>
          <Link href="/search" className="arrow-link">
            Search <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    );
  }

  const known = lib.videoById.get(id);
  const video = { id, ...cached, ...known, ...details };
  const why = cached && cached.why;
  const title = video.title || 'Untitled video';
  const mine = lib.ratingOf(id);
  const metaLine = [video.channel, yearOf(video.publishedAt), formatDuration(video.duration)].filter(Boolean).join(' · ');

  const onRate = async (score) => {
    if (status !== 'authenticated') {
      signIn('google');
      return;
    }
    try {
      await lib.rate(
        { id, title: video.title, channel: video.channel, thumbnail: video.thumbnail, category: video.category },
        score
      );
      setEnded(false);
      toast(`Saved. You gave it ${withArticle(score)}.`);
      loadStats();
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const onRemove = async () => {
    try {
      await lib.unrate(id);
      toast('Rating removed.');
      loadStats();
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const toggleFavourite = async () => {
    const next = !favourite;
    setFavourite(next);
    try {
      const res = await fetch('/api/favorites', {
        method: next ? 'POST' : 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          next
            ? { videoId: id, videoTitle: video.title, videoChannel: video.channel, videoThumbnail: video.thumbnail }
            : { videoId: id }
        ),
      });
      if (!res.ok) throw new Error('Could not update favourites');
      toast(next ? 'Added to your favourites.' : 'Removed from your favourites.');
    } catch (e) {
      setFavourite(!next);
      toast(e.message, { tone: 'error' });
    }
  };

  const prompt = ended && !mine;

  return (
    <>
      <Head>
        <title>{`${title} — ${BRAND.name}`}</title>
      </Head>

      <section className="theatre" aria-label="Video">
        <div className="theatre__frame">
          <Player id={id} title={title} onEnded={onEnded} />
        </div>
        <div className="theatre__caption">
          <span>Playing from YouTube</span>
          <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">
            Watch on YouTube ↗
          </a>
        </div>
      </section>

      <div className="page">
        <div className="watch">
          <div className="watch__main">
            <h1 className="h1">{title}</h1>
            {metaLine && <p className="meta">{metaLine}</p>}
            {why && (
              <div className="why">
                <span className="label">Why it’s on your programme</span>
                <p>{why}</p>
              </div>
            )}
          </div>

          <aside className="watch__aside">
            <div ref={ratingRef} className={`panel${prompt ? ' panel--prompt' : ''}`}>
              <span className="label">{prompt ? 'That’s the end' : 'Your rating'}</span>
              {prompt && <p className="h3">How was it?</p>}
              <RatingStrip value={mine} onChange={onRate} size="lg" label={`Rate ${title}`} />
              <p className="setting__desc">
                {mine
                  ? `You gave it ${withArticle(mine)}. Tap another mark to change it.`
                  : 'Rate it once you’ve watched. One tap, from one to ten.'}
              </p>
              {mine && (
                <div>
                  <button type="button" className="textbtn textbtn--danger" onClick={onRemove}>
                    Remove rating
                  </button>
                </div>
              )}
            </div>

            <div className="panel">
              <span className="label">Community</span>
              {stats && stats.totalRatings > 0 ? (
                <>
                  <Score value={stats.averageRating} caption={plural(stats.totalRatings, 'rating')} />
                  <Histogram distribution={stats.ratingDistribution} mine={mine} />
                </>
              ) : (
                <p className="setting__desc">No one here has rated this yet. You could be the first.</p>
              )}
            </div>

            {status === 'authenticated' && favourite !== null && (
              <div className="panel">
                <span className="label">Favourites</span>
                <div>
                  <button type="button" className="textbtn" onClick={toggleFavourite}>
                    {favourite ? 'In your favourites — remove' : 'Add to your favourites'}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
