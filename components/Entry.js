import Link from 'next/link';
import Still from './Still';
import Score from './Score';
import { describeReason, plural } from '../lib/format';
import { rememberVideos } from '../lib/videoCache';

const no = (n) => `No. ${String(n).padStart(2, '0')}`;

function remember(rec) {
  rememberVideos([{ ...rec.video, why: describeReason(rec) }]);
}

function Foot({ rec }) {
  if (rec.avgRating == null) return null;
  const count = rec.recommenderCount || rec.ratingCount || 0;
  return (
    <div className="entry__foot">
      <Score value={rec.avgRating} size="sm" caption={count ? plural(count, 'rating') : null} />
    </div>
  );
}

/** The day's main feature: a large still beside its placard. */
export function FeatureEntry({ rec, n }) {
  const href = `/watch/${rec.video.id}`;
  return (
    <article className="feature">
      <Link href={href} onClick={() => remember(rec)} aria-label={rec.video.title}>
        <Still id={rec.video.id} title={rec.video.title} size="lg" priority />
      </Link>
      <div className="feature__text">
        <span className="entry__no">{no(n)}</span>
        <Link href={href} onClick={() => remember(rec)}>
          <h2 className="feature__title">{rec.video.title}</h2>
        </Link>
        <p className="entry__by">{rec.video.channel}</p>
        <p className="entry__why">{describeReason(rec)}</p>
        <Foot rec={rec} />
      </div>
    </article>
  );
}

/** A programme entry: still, title, and the reason it's on the bill. */
export function CardEntry({ rec, n }) {
  const href = `/watch/${rec.video.id}`;
  return (
    <article className="entry">
      <Link href={href} onClick={() => remember(rec)} aria-label={rec.video.title}>
        <Still id={rec.video.id} title={rec.video.title} />
      </Link>
      <div className="entry__head">
        <span className="entry__no">{no(n)}</span>
      </div>
      <Link href={href} onClick={() => remember(rec)}>
        <h3 className="entry__title">{rec.video.title}</h3>
      </Link>
      <p className="entry__by">{rec.video.channel}</p>
      <p className="entry__why">{describeReason(rec)}</p>
      <Foot rec={rec} />
    </article>
  );
}

/** The rest of the bill, as a compact numbered list. */
export function RowEntry({ rec, n }) {
  return (
    <Link href={`/watch/${rec.video.id}`} className="row row--numbered" onClick={() => remember(rec)}>
      <span className="row__no">{String(n).padStart(2, '0')}</span>
      <Still id={rec.video.id} title={rec.video.title} size="sm" />
      <span className="row__body">
        <span className="row__title">{rec.video.title}</span>
        <span className="row__sub">{rec.video.channel}</span>
        <span className="row__why">{describeReason(rec)}</span>
      </span>
      <span className="row__end">
        {rec.avgRating != null && <span className="row__score">{Number(rec.avgRating).toFixed(1)}</span>}
      </span>
    </Link>
  );
}
