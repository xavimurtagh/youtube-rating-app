import { useState } from 'react';

/** A round portrait, or the person's initial set in the serif. */
export default function Avatar({ name, src, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <span className={`avatar${size === 'lg' ? ' avatar--lg' : ''}`} aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        initial
      )}
    </span>
  );
}
