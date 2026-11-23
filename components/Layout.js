import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Avatar from './Avatar';
import { useSignIn } from './Human';
import { BRAND } from '../lib/brand';
import { currentPoll } from '../lib/polls';

const NAV = [
  { href: '/', label: 'Today' },
  { href: '/saved', label: 'Saved' },
  { href: '/diary', label: 'Diary' },
  { href: '/people', label: 'People' },
  { href: '/search', label: 'Search' },
];

/**
 * Lights down for the dark "screening room" theme, lights up for paper.
 * Both labels are rendered and CSS shows the right one from the theme
 * attribute, so the masthead never shifts while the page hydrates.
 * Settings keeps the third option: follow the system.
 */
export function LightsToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button type="button" className="lights" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      <svg className="lights__mark" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 1.6a6.4 6.4 0 0 1 0 12.8z" fill="currentColor" />
      </svg>
      <span className="lights__label lights__label--down">Lights down</span>
      <span className="lights__label lights__label--up">Lights up</span>
      <span className="sr-only"> (switch theme)</span>
    </button>
  );
}

/** The poll, while there is one, joins the masthead (decided after hydration: it depends on the date). */
function usePollNav() {
  const [poll, setPoll] = useState(null);
  useEffect(() => {
    const p = currentPoll();
    setPoll(p ? { href: `/polls/${p.slug}`, label: 'Poll' } : null);
  }, []);
  return poll;
}

export default function Layout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const signIn = useSignIn();
  const poll = usePollNav();
  const items = poll ? [...NAV.slice(0, 4), poll, ...NAV.slice(4)] : NAV;

  const isActive = (href) => {
    if (href === '/') return router.pathname === '/';
    if (href.startsWith('/polls')) return router.pathname.startsWith('/polls');
    return router.pathname.startsWith(href);
  };

  return (
    <>
      <header className="masthead">
        <div className="page masthead__inner">
          <Link href="/" className="wordmark" aria-label={`${BRAND.name}, today's programme`}>
            {BRAND.name}
          </Link>

          {session && (
            <nav className="nav" aria-label="Main">
              {items.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="masthead__end">
            <LightsToggle />
            {status === 'authenticated' && (
              <Link href="/profile/me" aria-label="Your profile">
                <Avatar name={session.user?.name} src={session.user?.image} />
              </Link>
            )}
            {status === 'unauthenticated' && (
              <button type="button" className="btn btn--small btn--ghost" onClick={() => signIn()}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="footer">
        <div className="page footer__inner">
          <p>{BRAND.disclaimer}</p>
          <div className="footer__links">
            <Link href="/how-it-works">How it works</Link>
            {session && <Link href="/settings">Settings</Link>}
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
            <a href={BRAND.supportUrl} rel="noopener noreferrer" target="_blank">
              Support the project
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

/** The agreement YouTube's developer policies require before someone uses the app. */
export function Consent() {
  return (
    <p className="fineprint">
      By continuing you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>, and
      to the{' '}
      <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
        YouTube Terms of Service
      </a>
      .
    </p>
  );
}

/** Shown in place of a signed-in page when nobody is signed in. */
export function SignInPrompt({ title, body }) {
  const signIn = useSignIn();
  return (
    <div className="page">
      <div className="empty" style={{ paddingTop: 'var(--s-9)' }}>
        <h1 className="h1">{title}</h1>
        {body && <p className="lede">{body}</p>}
        <div>
          <button type="button" className="btn" onClick={() => signIn()}>
            Continue with Google
          </button>
        </div>
        <Consent />
      </div>
    </div>
  );
}

export function Loading({ children = 'One moment…' }) {
  return (
    <div className="page">
      <p className="loading">{children}</p>
    </div>
  );
}
