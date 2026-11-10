import { useState } from 'react';
import { signIn } from 'next-auth/react';
import RatingStrip from './RatingStrip';
import Avatar from './Avatar';
import { withArticle } from '../lib/format';
import { Consent } from './Layout';

const FRIENDS = ['Sam', 'Priya', 'Jo'];

export default function Landing() {
  const start = () => signIn('google');
  const [demo, setDemo] = useState(null);

  return (
    <div className="page">
      <section className="welcome">
        <div className="welcome__copy">
          <h1 className="display">
            Ready for your next <em>favourite</em> video?
          </h1>
          <p className="lede">See what your friends are loving, and get picks that come with a reason.</p>
          <div className="welcome__actions">
            <button type="button" className="btn" onClick={start}>
              Continue with Google
            </button>
          </div>
          <Consent />
        </div>

        <aside className="example" aria-label="An example pick">
          <div className="example__card" aria-hidden="true">
            <span className="example__card-title">The Egg</span>
          </div>
          <div className="example__body">
            <span className="meta">An example pick</span>
            <p className="example__title">The Egg — A Short Story</p>
            <p className="entry__by">Kurzgesagt – In a Nutshell</p>
            <p className="entry__why">Sam, your 82% taste match, gave it a 9.</p>
            <p className="example__friends">
              <span className="example__faces">
                {FRIENDS.map((name) => (
                  <Avatar key={name} name={name} size="sm" />
                ))}
              </span>
              Sam, Priya and Jo loved it
            </p>
            <div className="example__rate">
              <p className="h3" aria-live="polite">
                {demo ? `You gave it ${withArticle(demo)}.` : 'How was it?'}
              </p>
              <RatingStrip value={demo} onChange={setDemo} size="md" label="Try rating this example" />
              {demo ? (
                <button type="button" className="textbtn example__next" onClick={start}>
                  That’s all it takes. Find yours <span aria-hidden="true">→</span>
                </button>
              ) : (
                <p className="note">Go on, tap one.</p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <p className="promises">No endless feed. No autoplay. A reason for every pick.</p>
    </div>
  );
}
