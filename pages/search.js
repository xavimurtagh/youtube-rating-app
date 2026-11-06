import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Still from '../components/Still';
import Avatar from '../components/Avatar';
import { Loading, SignInPrompt } from '../components/Layout';
import { useToast } from '../components/Toast';
import { useLibrary } from '../contexts/LibraryContext';
import { socialAPI } from '../utils/api';
import { cleanVideoId } from '../utils/videoUtils';
import { rememberVideos } from '../lib/videoCache';
import { plural, yearOf } from '../lib/format';
import { BRAND } from '../lib/brand';

export default function Search() {
  const router = useRouter();
  const { status } = useSession();
  const lib = useLibrary();
  const toast = useToast();
  const type = router.query.type === 'people' ? 'people' : 'videos';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setResults(null);
    setError(null);
  }, [type]);

  if (status === 'loading') return <Loading />;
  if (status !== 'authenticated') {
    return <SignInPrompt title="Sign in to search." body="Find videos to watch and rate, and people whose taste you trust." />;
  }

  const setType = (next) => router.replace({ pathname: '/search', query: next === 'people' ? { type: 'people' } : {} }, undefined, { shallow: true });

  const submit = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    // A pasted link or ID opens directly and costs no search quota.
    if (type === 'videos' && (q.includes('youtu') || /^[a-zA-Z0-9_-]{11}$/.test(q))) {
      const id = cleanVideoId(q);
      if (id) {
        router.push(`/watch/${id}`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (type === 'videos') {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&maxResults=20`);
        if (!res.ok) {
          throw new Error(
            res.status === 403 || res.status === 429
              ? 'Search is resting for today. Paste a YouTube link to open a video directly.'
              : 'Search didn’t work just now. Try again in a moment.'
          );
        }
        const data = await res.json();
        const videos = data.videos || [];
        rememberVideos(videos);
        setResults(videos);
      } else {
        const people = await socialAPI.searchUsers(q);
        setResults(Array.isArray(people) ? people : []);
      }
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const follow = async (person) => {
    try {
      if (person.isFollowing) await socialAPI.unfollowUser(person.id);
      else await socialAPI.followUser(person.id);
      setResults((prev) => prev.map((p) => (p.id === person.id ? { ...p, isFollowing: !person.isFollowing } : p)));
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  return (
    <>
      <Head>
        <title>{`Search — ${BRAND.name}`}</title>
      </Head>
      <div className="page">
        <header className="page-head">
          <h1 className="h1">Search</h1>
          <div className="segmented" role="group" aria-label="Search for">
            <button type="button" aria-pressed={type === 'videos'} onClick={() => setType('videos')}>
              Videos
            </button>
            <button type="button" aria-pressed={type === 'people'} onClick={() => setType('people')}>
              People
            </button>
          </div>
        </header>

        <form className="searchbar" onSubmit={submit} role="search">
          <label htmlFor="q" className="sr-only">
            {type === 'videos' ? 'Search for a video' : 'Search for a person'}
          </label>
          <input
            id="q"
            className="field field--search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={type === 'videos' ? 'A title, a channel, or a YouTube link' : 'A name or an email address'}
            autoComplete="off"
            autoFocus
          />
          <button type="submit" className="btn" disabled={loading || !query.trim()}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div style={{ paddingTop: 'var(--s-7)' }}>
          {error && <p className="lede">{error}</p>}

          {!error && results === null && (
            <p className="prose">
              {type === 'videos'
                ? 'Every result opens in the screening room, where you can watch it and rate it. Pasting a YouTube link takes you straight there.'
                : 'Find friends by name or email. Only people who have chosen to be discoverable appear.'}
            </p>
          )}

          {results && results.length === 0 && <p className="lede">Nothing found for “{query.trim()}”.</p>}

          {results && results.length > 0 && type === 'videos' && (
            <div className="rows">
              {results.map((v) => {
                const mine = lib.ratingOf(v.id);
                return (
                  <Link key={v.id} href={`/watch/${v.id}`} className="row">
                    <Still id={v.id} title={v.title} />
                    <span className="row__body">
                      <span className="row__title">{v.title}</span>
                      <span className="row__sub">{[v.channel, yearOf(v.publishedAt)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="row__end">
                      {mine ? <span className="row__score">{mine}</span> : <span className="meta">Watch →</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {results && results.length > 0 && type === 'people' && (
            <div className="rows">
              {results.map((p) => (
                <div key={p.id} className="activity" style={{ gridTemplateColumns: '32px minmax(0,1fr) auto' }}>
                  <Avatar name={p.name} src={p.avatar} />
                  <div className="row__body">
                    <Link href={`/profile/${p.id}`} className="row__title">
                      {p.name}
                    </Link>
                    <span className="row__sub">{p.bio || plural(p.totalRatings || 0, 'rating')}</span>
                  </div>
                  <button type="button" className={`btn btn--small${p.isFollowing ? ' btn--ghost' : ''}`} onClick={() => follow(p)}>
                    {p.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
