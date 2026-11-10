import Head from 'next/head';
import Link from 'next/link';
import { BRAND } from '../lib/brand';

export default function HowItWorks() {
  return (
    <>
      <Head>
        <title>{`How it works — ${BRAND.name}`}</title>
      </Head>
      <div className="page page--narrow">
        <header className="page-head">
          <p className="label">How it works</p>
          <h1 className="h1">How your picks are chosen</h1>
          <p className="lede">No secret recipe. Here is exactly what we look at, and what we ignore.</p>
        </header>

        <section className="section stack">
          <h2 className="h2">What we optimise for</h2>
          <div className="prose">
            <p>
              One thing: whether you’ll be glad you watched. We measure that with ratings people give after watching,
              and we judge ourselves by how highly you rate the videos we pick for you.
            </p>
            <p>
              Every score you see here comes from members’ ratings, from one to ten. None of it comes from YouTube’s
              views or likes.
            </p>
          </div>
        </section>

        <section className="section stack">
          <h2 className="h2">The signals, in order</h2>
          <ol className="steps" style={{ gridTemplateColumns: '1fr' }}>
            <li>
              <h3 className="h3">People with taste like yours</h3>
              <p className="prose">
                We compare your ratings with other members’. When someone has rated the same videos the way you did,
                the things they loved and you haven’t seen rise to the top. Agreement on more videos counts for more.
              </p>
            </li>
            <li>
              <h3 className="h3">Categories and channels you rate highly</h3>
              <p className="prose">
                If you consistently rate a kind of video or a creator well, their best-rated work is a good bet.
              </p>
            </li>
            <li>
              <h3 className="h3">Community favourites</h3>
              <p className="prose">
                While we’re still learning your taste, we show what members here rate best, weighted so that a handful
                of perfect scores can’t outrank hundreds of strong ones.
              </p>
            </li>
          </ol>
        </section>

        <section className="section stack">
          <h2 className="h2">What we never use</h2>
          <div className="prose">
            <p>
              Watch time, clicks, how long you stay in the app, or anything an advertiser pays for. You get a few picks
              a day and then it ends, and that’s deliberate.
            </p>
          </div>
        </section>

        <section className="section stack">
          <h2 className="h2">Your controls</h2>
          <div className="prose">
            <p>
              You can stop your ratings being used for recommendations, hide your activity, or make your profile
              private at any time in{' '}
              <Link className="link" href="/settings">
                Settings
              </Link>
              . Those settings are enforced on our servers.
            </p>
          </div>
        </section>

        <section className="section stack">
          <h2 className="h2">About playback</h2>
          <div className="prose">
            <p>
              Videos play in YouTube’s own player, exactly as YouTube serves them, so creators are paid for views and
              ads as usual. {BRAND.disclaimer}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
