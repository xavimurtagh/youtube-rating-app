import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import RatingStrip from './RatingStrip';

const EXAMPLE = [
  {
    title: 'The Egg — A Short Story',
    by: 'Kurzgesagt – In a Nutshell',
    why: 'Because you gave 3Blue1Brown’s video on neural networks a 9.',
  },
  {
    title: 'Akira Kurosawa — Composing Movement',
    by: 'Every Frame a Painting',
    why: 'Sam, an 82% taste match, gave it a 9. Two others like you agreed.',
  },
  {
    title: 'Mac Miller: Tiny Desk Concert',
    by: 'NPR Music',
    why: 'A community favourite: 9.5 from 38 ratings.',
  },
];

export default function Landing() {
  const start = () => signIn('google');
  const [demo, setDemo] = useState(null);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__copy">
          <p className="label">For people who watch YouTube on purpose</p>
          <h1 className="display">
            Videos worth your time, <em>and the reasons why.</em>
          </h1>
          <p className="lede">
            Rate what you watch. Each day you get a short programme of videos chosen by people with taste like yours,
            every one with the reason it was picked. No autoplay, no endless feed, no guessing.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn" onClick={start}>
              Sign in with Google
            </button>
            <Link href="/how-it-works" className="arrow-link">
              How it works <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <aside className="specimen" aria-label="An example programme">
          <div className="specimen__head">
            <span className="dateline">Now showing</span>
            <span className="meta">An example</span>
          </div>
          <ol className="specimen__list">
            {EXAMPLE.map((item, i) => (
              <li key={item.title}>
                <span className="entry__no">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="specimen__title">{item.title}</p>
                  <p className="entry__by">{item.by}</p>
                  <p className="specimen__why">{item.why}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="specimen__end note">That’s it for today.</p>
        </aside>
      </section>

      <section className="section">
        <div className="principles">
          <div className="principle">
            <span className="principle__no">i.</span>
            <h2 className="h3">Ratings, not watch time</h2>
            <p className="prose">
              We rank videos by how much people enjoyed them once they’d finished, never by how long they kept anyone
              watching.
            </p>
          </div>
          <div className="principle">
            <span className="principle__no">ii.</span>
            <h2 className="h3">Every pick explains itself</h2>
            <p className="prose">
              Each recommendation comes with a plain reason. You can see what we think you like, and change it.
            </p>
          </div>
          <div className="principle">
            <span className="principle__no">iii.</span>
            <h2 className="h3">People, not pipelines</h2>
            <p className="prose">
              Follow friends and people with similar taste. A rating from someone like you counts for more than a
              million anonymous clicks.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="h2">How it works</h2>
        </div>
        <ol className="steps">
          <li>
            <h3 className="h3">Sign in with Google</h3>
            <p className="prose">We never see your password.</p>
          </li>
          <li>
            <h3 className="h3">Bring your history</h3>
            <p className="prose">Import your watch history from Google Takeout. It’s read in your browser and never uploaded.</p>
          </li>
          <li>
            <h3 className="h3">Rate ten videos</h3>
            <p className="prose">One tap each, from one to ten. The ones you rewatched most come first.</p>
            <div style={{ marginTop: 'var(--s-2)' }}>
              <RatingStrip value={demo} onChange={setDemo} size="sm" label="Try the rating control" />
            </div>
          </li>
          <li>
            <h3 className="h3">Open today’s programme</h3>
            <p className="prose">A short bill, each video with its reason. When you reach the end, that’s it for the day.</p>
          </li>
        </ol>
      </section>

      <section className="closing">
        <h2 className="h1">
          Fewer videos. <em>Better ones.</em>
        </h2>
        <button type="button" className="btn" onClick={start}>
          Sign in with Google
        </button>
      </section>
    </div>
  );
}
