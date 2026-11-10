import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { BRAND } from '../../lib/brand';

const MESSAGES = {
  Configuration: 'Sign-in isn’t configured correctly on our side. We’re sorry; please try again later.',
  AccessDenied: 'Access was denied. If you closed the Google window, you can simply try again.',
  Verification: 'That sign-in link has expired or has already been used.',
};

export default function AuthError() {
  const router = useRouter();
  const code = typeof router.query.error === 'string' ? router.query.error : '';

  return (
    <>
      <Head>
        <title>{`Sign-in problem — ${BRAND.name}`}</title>
      </Head>
      <div className="page">
        <div className="empty" style={{ paddingTop: 'var(--s-9)' }}>
          <p className="label">Sign-in problem</p>
          <h1 className="h1">That didn’t work.</h1>
          <p className="lede">{MESSAGES[code] || 'Something went wrong while signing you in.'}</p>
          <div className="hero__actions">
            <button type="button" className="btn" onClick={() => signIn('google', { callbackUrl: '/' })}>
              Try again
            </button>
            <Link href="/" className="arrow-link">
              Back to the start <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
