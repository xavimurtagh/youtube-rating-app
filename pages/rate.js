import { useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import Still from '../components/Still';
import RatingStrip from '../components/RatingStrip';
import { useLibrary } from '../contexts/LibraryContext';
import { cleanVideoId } from '../utils/videoUtils';
import { withArticle } from '../lib/format';
import { BRAND } from '../lib/brand';

/** The small window the bookmarklet opens from a YouTube page. */
export default function QuickRate() {
  const router = useRouter();
  const { status } = useSession();
  const lib = useLibrary();
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);

  const video = useMemo(() => {
    const id = cleanVideoId(router.query.videoId);
    if (!id) return null;
    const text = (v) => (typeof v === 'string' ? v.trim() : '');
    return { id, title: text(router.query.title) || 'Untitled video', channel: text(router.query.channel) || null };
  }, [router.query.videoId, router.query.title, router.query.channel]);

  const rate = async (score) => {
    setError(null);
    try {
      await lib.rate(video, score);
      setSaved(score);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <Head>
        <title>{`Rate — ${BRAND.name}`}</title>
      </Head>
      <div className="bare">
        <p className="wordmark">{BRAND.name}</p>

        {!router.isReady || status === 'loading' ? (
          <p className="loading" style={{ padding: 0 }}>
            One moment…
          </p>
        ) : !video ? (
          <p className="lede">Open a YouTube video, then click the bookmark again.</p>
        ) : status !== 'authenticated' ? (
          <div className="stack">
            <p className="lede">Sign in once, and this window will remember you.</p>
            <button type="button" className="btn" onClick={() => signIn('google')}>
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="stack">
            <Still id={video.id} title={video.title} />
            <div>
              <p className="h3">{video.title}</p>
              {video.channel && <p className="entry__by">{video.channel}</p>}
            </div>
            <RatingStrip value={saved ?? lib.ratingOf(video.id)} onChange={rate} size="lg" label={`Rate ${video.title}`} />
            {saved ? (
              <div className="stack">
                <p className="note">Saved. You gave it {withArticle(saved)}.</p>
                <button type="button" className="btn btn--ghost" onClick={() => window.close()}>
                  Close this window
                </button>
              </div>
            ) : (
              <p className="setting__desc">One tap, from one to ten. It saves straight away.</p>
            )}
            {error && <p className="note">{error}</p>}
          </div>
        )}
      </div>
    </>
  );
}

QuickRate.bare = true;
