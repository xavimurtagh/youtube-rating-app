import Link from 'next/link';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Avatar from './Avatar';
import { BRAND } from '../lib/brand';

const NAV = [
  { href: '/', label: 'Today' },
  { href: '/search', label: 'Search' },
  { href: '/diary', label: 'Diary' },
  { href: '/people', label: 'People' },
];

const THEME_LABEL = { system: 'Auto', light: 'Light', dark: 'Dark' };
const THEME_NEXT = { system: 'light', light: 'dark', dark: 'system' };

export function ThemeCycle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const current = theme || 'system';
  return (
    <button type="button" onClick={() => setTheme(THEME_NEXT[current] || 'system')} aria-label="Change theme">
      Theme: {THEME_LABEL[current] || 'Auto'}
    </button>
  );
}

export default function Layout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isActive = (href) => (href === '/' ? router.pathname === '/' : router.pathname.startsWith(href));

  return (
    <>
      <header className="masthead">
        <div className="page masthead__inner">
          <Link href="/" className="wordmark" aria-label={`${BRAND.name}, today's programme`}>
            {BRAND.name}
          </Link>

          {session && (
            <nav className="nav" aria-label="Main">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="masthead__end">
            {status === 'authenticated' && (
              <Link href="/profile/me" aria-label="Your profile">
                <Avatar name={session.user?.name} src={session.user?.image} />
              </Link>
            )}
            {status === 'unauthenticated' && (
              <button type="button" className="btn btn--small btn--ghost" onClick={() => signIn('google')}>
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
            <ThemeCycle />
            <a href={BRAND.supportUrl} rel="noopener noreferrer" target="_blank">
              Support the project
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

/** Shown in place of a signed-in page when nobody is signed in. */
export function SignInPrompt({ title, body }) {
  return (
    <div className="page">
      <div className="empty" style={{ paddingTop: 'var(--s-9)' }}>
        <h1 className="h1">{title}</h1>
        {body && <p className="lede">{body}</p>}
        <div>
          <button type="button" className="btn" onClick={() => signIn('google')}>
            Sign in with Google
          </button>
        </div>
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
