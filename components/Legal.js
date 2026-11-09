import Head from 'next/head';
import { BRAND } from '../lib/brand';

/** Shared frame for the privacy policy and terms: a narrow column of prose. */
export function LegalPage({ title, updated, intro, children }) {
  return (
    <>
      <Head>
        <title>{`${title} — ${BRAND.name}`}</title>
      </Head>
      <div className="page page--narrow">
        <header className="page-head">
          <p className="dateline">Last updated {updated}</p>
          <h1 className="h1">{title}</h1>
          {intro && <p className="lede">{intro}</p>}
        </header>
        <div className="legal">{children}</div>
      </div>
    </>
  );
}

export function Contact() {
  if (BRAND.contact) {
    return (
      <p>
        Email{' '}
        <a className="link" href={`mailto:${BRAND.contact}`}>
          {BRAND.contact}
        </a>
        .
      </p>
    );
  }
  return <p>Contact details will be added here before launch.</p>;
}

export const LINKS = {
  googlePrivacy: 'https://www.google.com/policies/privacy',
  youtubeTerms: 'https://www.youtube.com/t/terms',
  googlePermissions: 'https://myaccount.google.com/permissions',
};
