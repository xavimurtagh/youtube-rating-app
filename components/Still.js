import { useEffect, useMemo, useState } from 'react';
import { stillUrls } from '../lib/format';

/**
 * A video still, framed like a print: 16:9, hairline edge, colours calmed a
 * little until you hover. Falls back through YouTube's image sizes, then to a
 * typographic card if none load.
 */
export default function Still({ id, title, size = 'md', priority = false }) {
  const urls = useMemo(() => stillUrls(id, size), [id, size]);
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [id, size]);

  const failed = !id || index >= urls.length;

  return (
    <div className="still">
      {!failed ? (
        <img
          src={urls[index]}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setIndex((n) => n + 1)}
          onLoad={(e) => {
            // YouTube answers missing sizes with a tiny grey placeholder.
            if (e.currentTarget.naturalWidth <= 120 && index < urls.length - 1) setIndex((n) => n + 1);
          }}
        />
      ) : (
        <span className="still__fallback">{title}</span>
      )}
    </div>
  );
}
