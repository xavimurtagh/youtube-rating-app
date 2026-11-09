import Link from 'next/link';
import { LegalPage, Contact, LINKS } from '../components/Legal';
import { BRAND } from '../lib/brand';

const n = BRAND.name;

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      updated="9 November 2026"
      intro={`What ${n} keeps, why, and how to remove it. In short: we keep what you choose to add, we never see your password, your imported watch history stays in your browser, and you can delete everything at any time.`}
    >
      <section>
        <h2 className="h3">What we collect</h2>
        <ul>
          <li>
            <strong>When you sign in with Google:</strong> your name, email address and profile picture. We never see
            your Google password, and we don’t ask for access to your YouTube account.
          </li>
          <li>
            <strong>What you do here:</strong> your ratings, favourites, the people you follow, your bio if you write
            one, and your privacy settings.
          </li>
          <li>
            <strong>Only in your browser:</strong> if you import your watch history from Google Takeout, the file is
            read on your device and the list stays in your browser’s storage. It is not uploaded. When you rate one of
            those videos, that rating is saved to your account like any other.
          </li>
          <li>
            <strong>Basic logs:</strong> our hosting provider keeps short-lived server logs, such as IP addresses, to
            run the service and prevent abuse.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="h3">How we use it</h2>
        <ul>
          <li>To show your diary, profile and ratings, as your privacy settings allow.</li>
          <li>
            To choose picks. With personalised recommendations on, your ratings help choose picks for you and for
            people with similar taste, who may see your name and score as the reason for a pick (for example, “Sam,
            your 82% taste match, gave it a 9”). Turn this off in Settings and your ratings are left out.
          </li>
          <li>To show people who follow you what you’ve rated, if Show activity is on.</li>
          <li>
            We don’t sell your data or use it for advertising. Videos play in YouTube’s player, which may show
            YouTube’s own ads.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="h3">YouTube and Google</h2>
        <p>
          {n} uses YouTube API Services to look up video details and to search. Videos play in YouTube’s embedded
          player, in its privacy-enhanced mode. When you play a video, YouTube may collect information as described
          in the{' '}
          <a className="link" href={LINKS.googlePrivacy} target="_blank" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
          . Using {n} also means agreeing to the{' '}
          <a className="link" href={LINKS.youtubeTerms} target="_blank" rel="noopener noreferrer">
            YouTube Terms of Service
          </a>
          .
        </p>
        <p>
          You can remove {n}’s access to your Google account at any time from your{' '}
          <a className="link" href={LINKS.googlePermissions} target="_blank" rel="noopener noreferrer">
            Google account’s security settings
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="h3">Cookies and storage</h2>
        <p>
          We use a few essential cookies to keep you signed in, and none for advertising or tracking. Your browser’s
          storage keeps your theme, any history you imported, and a cache of video details so pages load faster.
        </p>
      </section>

      <section>
        <h2 className="h3">Who else handles it</h2>
        <p>
          Our hosting and database providers store your data for us. Google handles sign-in, and YouTube serves the
          videos and their details. Nobody else receives it.
        </p>
      </section>

      <section>
        <h2 className="h3">How long we keep it</h2>
        <p>
          Your account and ratings stay until you delete them. Video details from YouTube are refreshed or deleted
          within 30 days, as YouTube’s rules require, and search results are kept for a day.
        </p>
      </section>

      <section>
        <h2 className="h3">Your choices</h2>
        <p>
          In <Link className="link" href="/settings">Settings</Link> you can hide your profile, stop appearing in
          search, hide your activity, turn off personalised recommendations, download your data, and delete your
          account. Deleting removes your account, ratings, favourites, follows and activity from our database
          straight away.
        </p>
      </section>

      <section>
        <h2 className="h3">Children</h2>
        <p>{n} is not for children under 13.</p>
      </section>

      <section>
        <h2 className="h3">Changes and contact</h2>
        <p>If this policy changes, the date at the top changes too, and we’ll tell you in the app if it matters.</p>
        <Contact />
      </section>
    </LegalPage>
  );
}
