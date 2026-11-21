import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Loading, SignInPrompt } from '../components/Layout';
import { useToast } from '../components/Toast';
import { useLibrary } from '../contexts/LibraryContext';
import { BRAND } from '../lib/brand';

const PRIVACY = [
  { key: 'discoverable', title: 'Discoverable', desc: 'Others can find you by name or email in search.' },
  { key: 'publicProfile', title: 'Public profile', desc: 'Others can see your ratings and favourites on your profile.' },
  { key: 'showActivity', title: 'Show activity', desc: 'People who follow you see what you rate highly. Needs a public profile.' },
  {
    key: 'allowRecommendations',
    title: 'Personalised recommendations',
    desc: 'Use your ratings to choose your picks and to help choose picks for people with similar taste. With a public profile they may see your name and score as the reason; with a private one, you stay anonymous.',
  },
];

function bookmarkletFor(origin) {
  const code = `(function(){var u=new URL(location.href),id=u.searchParams.get('v');if(!id){var m=location.pathname.match(/\\/shorts\\/([\\w-]{11})/);id=m&&m[1];}if(!id){alert('Open a YouTube video first.');return;}var t=(document.querySelector('h1.ytd-watch-metadata yt-formatted-string')||{}).textContent||document.title.replace(/ - YouTube$/,'');var c=(document.querySelector('ytd-video-owner-renderer ytd-channel-name a')||{}).textContent||'';window.open('${origin}/rate?videoId='+encodeURIComponent(id)+'&title='+encodeURIComponent(t.trim())+'&channel='+encodeURIComponent(c.trim()),'matinee','width=480,height=640');})();`;
  return `javascript:${code}`;
}

function Group({ title, intro, children }) {
  return (
    <section className="setting-group">
      <div className="setting-group__intro">
        <h2 className="h3">{title}</h2>
        {intro && <p className="setting__desc">{intro}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function Settings() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const lib = useLibrary();
  const toast = useToast();
  const [privacy, setPrivacy] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Bookmarklets are javascript: links by nature. React warns about (and will
  // eventually block) those in props, so we set it on the DOM node directly.
  const bookmarkletRef = useCallback((el) => {
    if (el) el.setAttribute('href', bookmarkletFor(window.location.origin));
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/privacy', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setPrivacy)
      .catch(() => setPrivacy(null));
  }, [status]);

  if (status === 'loading') return <Loading />;
  if (status !== 'authenticated') return <SignInPrompt title="Sign in to change your settings." />;

  const updatePrivacy = async (key, value) => {
    const previous = privacy;
    setPrivacy({ ...privacy, [key]: value });
    try {
      const res = await fetch('/api/privacy', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error('Could not save that setting');
      setPrivacy(await res.json());
      toast('Saved.');
    } catch (e) {
      setPrivacy(previous);
      toast(e.message, { tone: 'error' });
    }
  };

  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      ratings: lib.ratedList.map((r) => ({ videoId: r.video.id, title: r.video.title, channel: r.video.channel, score: r.score, ratedAt: r.ratedAt })),
      history: lib.videos.filter((v) => v.watchedAt),
      privacy,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${BRAND.name.toLowerCase()}-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const deleteEverything = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/clear-all-data', { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Could not delete your data. Nothing was removed.');
      lib.clearLocal();
      toast('Everything has been deleted.');
      setTimeout(() => signOut({ callbackUrl: '/' }), 900);
    } catch (e) {
      toast(e.message, { tone: 'error' });
      setDeleting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`Settings — ${BRAND.name}`}</title>
      </Head>
      <div className="page">
        <header className="page-head">
          <h1 className="h1">Settings</h1>
        </header>

        <Group title="Account" intro="You sign in with Google. We never see your password.">
          <div className="setting">
            <div className="setting__text">
              <span className="setting__title">{session.user?.name}</span>
              <span className="setting__desc">{session.user?.email}</span>
            </div>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                // Leave nothing personal behind on a shared computer.
                lib.clearLocal();
                signOut({ callbackUrl: '/' });
              }}
            >
              Sign out
            </button>
          </div>
        </Group>

        <Group title="Appearance">
          <div className="setting">
            <div className="setting__text">
              <span className="setting__title">Theme</span>
              <span className="setting__desc">Auto follows your device.</span>
            </div>
            <div className="segmented" role="group" aria-label="Theme">
              {[
                ['system', 'Auto'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ].map(([value, label]) => (
                <button key={value} type="button" aria-pressed={(theme || 'system') === value} onClick={() => setTheme(value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Group>

        <Group title="Privacy" intro="These are enforced on our servers, not just hidden in the interface.">
          {privacy === null ? (
            <p className="loading" style={{ padding: 0 }}>
              One moment…
            </p>
          ) : (
            PRIVACY.map((s) => (
              <div key={s.key} className="setting">
                <label className="setting__text" htmlFor={`privacy-${s.key}`}>
                  <span className="setting__title">{s.title}</span>
                  <span className="setting__desc">{s.desc}</span>
                </label>
                <input
                  id={`privacy-${s.key}`}
                  type="checkbox"
                  className="switch"
                  checked={!!privacy[s.key]}
                  onChange={(e) => updatePrivacy(s.key, e.target.checked)}
                />
              </div>
            ))
          )}
        </Group>

        <Group title="Rate while on YouTube" intro="On a computer, drag this to your bookmarks bar. Click it on any YouTube video to rate it here.">
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a ref={bookmarkletRef} className="bookmarklet" onClick={(e) => e.preventDefault()}>
            Rate on {BRAND.name}
          </a>
        </Group>

        <Group title="Your data" intro="Your ratings, favourites and follows live in our database. Imported history stays in this browser.">
          <div className="setting">
            <div className="setting__text">
              <span className="setting__title">Export</span>
              <span className="setting__desc">Download your ratings and history as a JSON file.</span>
            </div>
            <button type="button" className="btn btn--small btn--ghost" onClick={exportData}>
              Export
            </button>
          </div>
          <div className="setting">
            <div className="setting__text">
              <span className="setting__title">Delete everything</span>
              <span className="setting__desc">
                Permanently deletes your account, with your ratings, favourites, follows and activity, and clears this
                browser. Type “delete” to confirm.
              </span>
              <input
                className="field"
                style={{ maxWidth: '14rem', marginTop: 'var(--s-2)' }}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                aria-label="Type delete to confirm"
                placeholder="delete"
              />
            </div>
            <button
              type="button"
              className="btn btn--small"
              disabled={confirmText.trim().toLowerCase() !== 'delete' || deleting}
              onClick={deleteEverything}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Group>
      </div>
    </>
  );
}
