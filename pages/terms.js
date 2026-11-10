import Link from 'next/link';
import { LegalPage, Contact, LINKS } from '../components/Legal';
import { BRAND } from '../lib/brand';

const n = BRAND.name;

export default function Terms() {
  return (
    <LegalPage
      title="Terms"
      updated="9 November 2026"
      intro={`The rules for using ${n}. They’re short, and written to be read.`}
    >
      <section>
        <h2 className="h3">Agreeing to these terms</h2>
        <p>
          By using {n} you agree to these terms, to our <Link className="link" href="/privacy">privacy policy</Link>,
          and to be bound by the{' '}
          <a className="link" href={LINKS.youtubeTerms} target="_blank" rel="noopener noreferrer">
            YouTube Terms of Service
          </a>
          , because {n} plays videos through YouTube.
        </p>
      </section>

      <section>
        <h2 className="h3">What {n} is</h2>
        <p>
          {n} works with YouTube. It is not affiliated with or endorsed by YouTube or Google. Videos belong to their
          creators and play in YouTube’s own player; we don’t host or change them. The ratings and scores you see here
          come from {n} members, not from YouTube.
        </p>
      </section>

      <section>
        <h2 className="h3">Your account</h2>
        <p>
          You sign in with a Google account and must be at least 13, or older where your country requires it. Keep
          your account to yourself, and tell us if you think someone else is using it.
        </p>
      </section>

      <section>
        <h2 className="h3">What you add</h2>
        <p>
          Your ratings, favourites and bio are yours. You let us store and show them as your privacy settings allow,
          including as the reason for someone else’s pick when personalised recommendations are on. You can delete
          them at any time.
        </p>
      </section>

      <section>
        <h2 className="h3">Fair use</h2>
        <ul>
          <li>Rate honestly. Don’t use extra accounts, scripts or swaps to push a video’s score up or down.</li>
          <li>Don’t harass people, impersonate anyone, or put anything unlawful in your bio.</li>
          <li>Don’t scrape {n}, overload it, or try to get around its limits or security.</li>
        </ul>
        <p>We may remove ratings or close accounts that break these rules.</p>
      </section>

      <section>
        <h2 className="h3">No guarantees</h2>
        <p>
          {n} is provided as it is. We work to keep it running and accurate, but we can’t promise it always will be,
          or that every pick will suit you. As far as the law allows, we aren’t liable for losses from using it.
        </p>
      </section>

      <section>
        <h2 className="h3">Changes and leaving</h2>
        <p>
          We may update these terms; the date at the top shows when. You can stop using {n} and delete your account
          from <Link className="link" href="/settings">Settings</Link> whenever you like.
        </p>
        <Contact />
      </section>
    </LegalPage>
  );
}
