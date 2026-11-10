import Link from 'next/link';
import Still from './Still';
import Avatar from './Avatar';
import { describeReason, withArticle } from '../lib/format';
import { rememberVideos } from '../lib/videoCache';

function remember(rec) {
  rememberVideos([{ ...rec.video, why: describeReason(rec) }]);
}

/** The first pick: a large still beside its title and reason. */
export function FeatureEntry({ rec }) {
  const href = `/watch/${rec.video.id}`;
  return (
    <article className="feature">
      <Link href={href} onClick={() => remember(rec)} aria-label={rec.video.title}>
        <Still id={rec.video.id} title={rec.video.title} size="lg" priority />
      </Link>
      <div className="feature__text">
        <Link href={href} onClick={() => remember(rec)}>
          <h2 className="feature__title">{rec.video.title}</h2>
        </Link>
        <p className="entry__by">{rec.video.channel}</p>
        <p className="entry__why">{describeReason(rec)}</p>
      </div>
    </article>
  );
}

/** A pick: still, title, channel and the reason it's here. */
export function CardEntry({ rec }) {
  const href = `/watch/${rec.video.id}`;
  return (
    <article className="entry">
      <Link href={href} onClick={() => remember(rec)} aria-label={rec.video.title}>
        <Still id={rec.video.id} title={rec.video.title} />
      </Link>
      <Link href={href} onClick={() => remember(rec)}>
        <h3 className="entry__title">{rec.video.title}</h3>
      </Link>
      <p className="entry__by">{rec.video.channel}</p>
      <p className="entry__why">{describeReason(rec, { short: true })}</p>
    </article>
  );
}

/** A compact pick, for the longer list behind "More picks". */
export function RowEntry({ rec }) {
  return (
    <Link href={`/watch/${rec.video.id}`} className="row" onClick={() => remember(rec)}>
      <Still id={rec.video.id} title={rec.video.title} size="sm" />
      <span className="row__body">
        <span className="row__title">{rec.video.title}</span>
        <span className="row__sub">{rec.video.channel}</span>
        <span className="row__why">{describeReason(rec, { short: true })}</span>
      </span>
    </Link>
  );
}

/** Something a friend rated highly: their face and score instead of a reason. */
export function FriendEntry({ item }) {
  const href = `/watch/${item.video.id}`;
  const keep = () => rememberVideos([{ ...item.video, why: `${item.name} gave it ${withArticle(item.score)}.` }]);
  return (
    <article className="entry">
      <Link href={href} onClick={keep} aria-label={item.video.title}>
        <Still id={item.video.id} title={item.video.title} />
      </Link>
      <Link href={href} onClick={keep}>
        <h3 className="entry__title">{item.video.title}</h3>
      </Link>
      <p className="entry__friend">
        <Avatar name={item.name} src={item.avatar} size="sm" />
        <span>
          <strong>{item.name}</strong> gave it {withArticle(item.score)}
        </span>
      </p>
    </article>
  );
}
