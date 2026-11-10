import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Avatar from '../../components/Avatar';
import Still from '../../components/Still';
import { Histogram } from '../../components/Score';
import { Loading, SignInPrompt } from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { useLibrary } from '../../contexts/LibraryContext';
import { socialAPI } from '../../utils/api';
import { pearson } from '../../lib/recommend';
import { plural, spelled } from '../../lib/format';
import { BRAND } from '../../lib/brand';

function tasteMatch(theirRatings, ratingOf) {
  const mine = [];
  const theirs = [];
  for (const r of theirRatings) {
    const score = ratingOf(r.videoId);
    if (score == null) continue;
    mine.push(score);
    theirs.push(r.score);
  }
  if (mine.length < 3) return { common: mine.length, percent: null };
  const r = pearson(mine, theirs);
  return { common: mine.length, percent: Math.round(Math.max(0, r) * 100), r };
}

function matchWords(r) {
  if (r >= 0.7) return 'Very similar taste';
  if (r >= 0.4) return 'Similar taste';
  if (r >= 0.1) return 'Some overlap';
  return 'Different tastes';
}

export default function Profile() {
  const router = useRouter();
  const { status } = useSession();
  const lib = useLibrary();
  const toast = useToast();
  const id = typeof router.query.id === 'string' ? router.query.id : null;

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!id || status !== 'authenticated') return;
    setProfile(null);
    setError(null);
    socialAPI
      .getProfile(id)
      .then((p) => {
        setProfile(p);
        setFollowing((p.followers || []).some((f) => f.followerId === p.viewerId));
      })
      .catch(() => setError('We couldn’t find that profile.'));
  }, [id, status]);

  const ratings = useMemo(() => profile?.ratings || [], [profile]);
  const isMe = !!profile && profile.id === profile.viewerId;

  const distribution = useMemo(() => {
    const d = {};
    for (const r of ratings) d[r.score] = (d[r.score] || 0) + 1;
    return d;
  }, [ratings]);

  const average = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : null;
  const match = useMemo(() => (profile && !isMe ? tasteMatch(ratings, lib.ratingOf) : null), [profile, isMe, ratings, lib]);

  if (status === 'loading' || (!profile && !error && status === 'authenticated')) return <Loading />;
  if (status !== 'authenticated') return <SignInPrompt title="Sign in to see profiles." />;
  if (error) {
    return (
      <div className="page">
        <div className="empty" style={{ paddingTop: 'var(--s-9)' }}>
          <h1 className="h1">{error}</h1>
          <Link href="/people" className="arrow-link">
            People <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    );
  }

  const toggleFollow = async () => {
    try {
      if (following) await socialAPI.unfollowUser(profile.id);
      else await socialAPI.followUser(profile.id);
      setFollowing(!following);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const favourites = (profile.favourites || []).slice(0, 4);

  return (
    <>
      <Head>
        <title>{`${profile.name} — ${BRAND.name}`}</title>
      </Head>
      <div className="page">
        <header className="profile-head">
          <Avatar name={profile.name} src={profile.avatar} size="lg" />
          <div className="stack">
            <h1 className="h1">{profile.name}</h1>
            {profile.bio && <p className="lede">{profile.bio}</p>}
            {!profile.isPrivate && (
              <p className="stats">
                <span>
                  <b>{ratings.length}</b>rated
                </span>
                {average != null && (
                  <span>
                    <b>{average.toFixed(1)}</b>average
                  </span>
                )}
                <span>
                  <b>{(profile.following || []).length}</b>following
                </span>
                <span>
                  <b>{(profile.followers || []).length}</b>followers
                </span>
              </p>
            )}
          </div>
          <div>
            {isMe ? (
              <Link href="/settings" className="btn btn--ghost">
                Settings
              </Link>
            ) : (
              <button type="button" className={`btn${following ? ' btn--ghost' : ''}`} onClick={toggleFollow}>
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </header>

        {profile.isPrivate ? (
          <section className="section">
            <p className="lede">This profile is private.</p>
          </section>
        ) : (
          <>
            {match && (
              <section className="section">
                <div className="match">
                  <span className="label">You and {profile.name.split(' ')[0]}</span>
                  {match.percent != null ? (
                    <>
                      <p className="h2">
                        {match.percent}% taste match. <em>{matchWords(match.r)}.</em>
                      </p>
                      <p className="prose">From {plural(match.common, 'video')} you’ve both rated.</p>
                    </>
                  ) : (
                    <p className="prose">
                      {match.common === 0
                        ? 'You haven’t rated any of the same videos yet.'
                        : `You’ve rated ${spelled(match.common)} of the same videos. A few more and we can compare your taste.`}
                    </p>
                  )}
                </div>
              </section>
            )}

            {favourites.length > 0 && (
              <section className="section">
                <div className="section__head">
                  <h2 className="h2">Favourites</h2>
                </div>
                <div className="favourites">
                  {favourites.map((v) => (
                    <Link key={v.id} href={`/watch/${v.id}`} className="entry">
                      <Still id={v.id} title={v.title} />
                      <span className="entry__title" style={{ fontSize: '1.02rem' }}>
                        {v.title}
                      </span>
                      <span className="entry__by">{v.channel}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {ratings.length > 0 && (
              <section className="section">
                <div className="section__head">
                  <h2 className="h2">How {isMe ? 'you rate' : 'they rate'}</h2>
                  <span className="meta">{plural(ratings.length, 'rating')}</span>
                </div>
                <div style={{ maxWidth: '28rem' }}>
                  <Histogram distribution={distribution} />
                </div>
              </section>
            )}

            <section className="section">
              <div className="section__head">
                <h2 className="h2">Recently rated</h2>
              </div>
              {ratings.length === 0 ? (
                <p className="prose">{isMe ? 'Nothing rated yet.' : 'Nothing rated yet.'}</p>
              ) : (
                <div className="rows">
                  {ratings.slice(0, 20).map((r) => (
                    <Link key={r.id || r.videoId} href={`/watch/${r.videoId}`} className="row">
                      <Still id={r.videoId} title={r.videoTitle} size="sm" />
                      <span className="row__body">
                        <span className="row__title">{r.videoTitle || 'Untitled video'}</span>
                        <span className="row__sub">{r.videoChannel}</span>
                      </span>
                      <span className="row__end">
                        <span className="row__score">{r.score}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
