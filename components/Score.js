/** A score set in the serif, Pitchfork-style: "8.4". */
export default function Score({ value, caption, size = 'md' }) {
  if (value == null) return null;
  return (
    <span className={`score${size === 'sm' ? ' score--sm' : ''}`}>
      <span className="score__n">{Number(value).toFixed(1)}</span>
      {caption && <span className="score__caption">{caption}</span>}
    </span>
  );
}

/** How a video's ratings are spread across 1–10; your own score in amber. */
export function Histogram({ distribution = {}, mine = null }) {
  const counts = Array.from({ length: 10 }, (_, i) => Number(distribution[i + 1] || 0));
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="hist" role="img" aria-label={`Spread of ${total} ratings from 1 to 10`}>
        {counts.map((c, i) => (
          <span
            key={i}
            className="hist__bar"
            data-mine={mine === i + 1}
            style={{ height: `${Math.max(3, (c / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="hist__axis" aria-hidden="true">
        {counts.map((_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
    </div>
  );
}
