import Link from 'next/link';
import { LegalPage, Contact } from '../components/Legal';
import { BRAND } from '../lib/brand';

const n = BRAND.name;

export default function Security() {
  return (
    <LegalPage
      title="Security"
      updated="22 November 2026"
      intro={`How to tell us about a security problem in ${n}, and what we do about it.`}
    >
      <section>
        <h2 className="h3">Found something?</h2>
        <p>
          Please tell us privately before telling anyone else, with enough detail for us to see the problem: what
          you did, what happened, and the page or address involved. We’ll reply within a few days, keep you posted,
          and say when it’s fixed.
        </p>
        <Contact />
      </section>

      <section>
        <h2 className="h3">Please don’t</h2>
        <ul>
          <li>Look at, change or delete other members’ data. Use your own accounts for testing.</li>
          <li>Run tests that slow the site down for everyone, or send spam.</li>
          <li>Try to get into the accounts or devices of the people who run {n}.</li>
        </ul>
        <p>Research that follows these rules is welcome, and we won’t pursue anyone acting in good faith.</p>
      </section>

      <section>
        <h2 className="h3">How we protect your data</h2>
        <p>
          Sign-in is with Google, and your account is tied to your Google account itself rather than your email
          address. Your privacy settings are enforced on our servers. Every change you make is checked to come from
          this site, limits apply to everything, and imported watch history never leaves your browser. More in our{' '}
          <Link className="link" href="/privacy">
            privacy policy
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
