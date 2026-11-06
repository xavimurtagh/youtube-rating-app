import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Avatar from '../components/Avatar';
import { Loading, SignInPrompt } from '../components/Layout';
import { useToast } from '../components/Toast';
import { socialAPI } from '../utils/api';
import { plural } from '../lib/format';
import { BRAND } from '../lib/brand';

function PersonRow({ person, action }) {
  return (
    <div className="activity">
      <Avatar name={person.name} src={person.avatar} />
      <div className="row__body">
        <Link href={`/profile/${person.id}`} className="row__title">
          {person.name}
        </Link>
        <span className="row__sub">{person.bio || plural(person.totalRatings || 0, 'rating')}</span>
      </div>
      {action}
    </div>
  );
}

export default function People() {
  const router = useRouter();
  const { status } = useSession();
  const toast = useToast();
  const tab = ['following', 'followers'].includes(router.query.tab) ? router.query.tab : 'following';
  const [following, setFollowing] = useState(null);
  const [followers, setFollowers] = useState(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    socialAPI.getFollowing().then(setFollowing).catch(() => setFollowing([]));
    socialAPI.getFollowers().then(setFollowers).catch(() => setFollowers([]));
  }, [status]);

  if (status === 'loading') return <Loading />;
  if (status !== 'authenticated') {
    return <SignInPrompt title="Sign in to follow people." body="Their ratings shape your programme." />;
  }

  const followingIds = new Set((following || []).map((p) => p.id));

  const unfollow = async (person) => {
    try {
      await socialAPI.unfollowUser(person.id);
      setFollowing((prev) => prev.filter((p) => p.id !== person.id));
      toast(`Unfollowed ${person.name}.`);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const followBack = async (person) => {
    try {
      await socialAPI.followUser(person.id);
      setFollowing((prev) => [...(prev || []), person]);
      toast(`Following ${person.name}.`);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  const go = (next) => router.replace({ pathname: '/people', query: next === 'following' ? {} : { tab: next } }, undefined, { shallow: true });
  const list = tab === 'following' ? following : followers;

  return (
    <>
      <Head>
        <title>{`People — ${BRAND.name}`}</title>
      </Head>
      <div className="page">
        <header className="page-head">
          <h1 className="h1">People</h1>
          <p className="lede">Follow friends and people whose taste you trust. Their ratings shape your programme.</p>
          <div>
            <Link href="/search?type=people" className="arrow-link">
              Find people <span aria-hidden="true">→</span>
            </Link>
          </div>
        </header>

        <div className="tabs" role="tablist" aria-label="People">
          <button type="button" role="tab" className="tab" aria-selected={tab === 'following'} onClick={() => go('following')}>
            Following<span className="tab__count">{following ? following.length : ''}</span>
          </button>
          <button type="button" role="tab" className="tab" aria-selected={tab === 'followers'} onClick={() => go('followers')}>
            Followers<span className="tab__count">{followers ? followers.length : ''}</span>
          </button>
        </div>

        {list === null ? (
          <p className="loading">One moment…</p>
        ) : list.length === 0 ? (
          <div className="empty">
            <p className="empty__title">{tab === 'following' ? 'You’re not following anyone yet.' : 'No followers yet.'}</p>
            <p className="empty__body">
              {tab === 'following'
                ? 'Follow a few friends and their ratings will start appearing on your programme.'
                : 'Share your profile with friends so they can follow your ratings.'}
            </p>
          </div>
        ) : (
          <div className="rows" style={{ borderTop: 0 }}>
            {list.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={
                  tab === 'following' ? (
                    <button type="button" className="btn btn--small btn--ghost" onClick={() => unfollow(person)}>
                      Unfollow
                    </button>
                  ) : followingIds.has(person.id) ? (
                    <span className="meta">Following</span>
                  ) : (
                    <button type="button" className="btn btn--small" onClick={() => followBack(person)}>
                      Follow back
                    </button>
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
