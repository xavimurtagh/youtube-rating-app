import { useEffect, useRef, useState } from 'react';
import { MOODS, MAX_MOODS_PER_PERSON } from '../lib/moods';
import { useToast } from './Toast';

/**
 * After rating: "What was it like?" Up to two words, one tap each. They feed
 * the mood filters, and show to everyone once enough people agree.
 */
export default function MoodTap({ videoId, initial = [], onSaved }) {
  const toast = useToast();
  const [chosen, setChosen] = useState(initial);
  const latest = useRef(initial);

  useEffect(() => {
    setChosen(initial);
    latest.current = initial;
    // Only when the video or the server's answer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, initial.join(',')]);

  const toggle = async (key) => {
    const previous = latest.current;
    let next = previous.includes(key) ? previous.filter((k) => k !== key) : [...previous, key];
    if (next.length > MAX_MOODS_PER_PERSON) next = next.slice(-MAX_MOODS_PER_PERSON);
    latest.current = next;
    setChosen(next);
    try {
      const res = await fetch('/api/moods', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, moods: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'That didn’t save.');
      if (onSaved) onSaved(body);
    } catch (e) {
      latest.current = previous;
      setChosen(previous);
      toast(e.message, { tone: 'error' });
    }
  };

  return (
    <div className="panel">
      <p className="h3">What was it like?</p>
      <div className="tags" role="group" aria-label="What was it like? Pick up to two">
        {MOODS.map((m) => (
          <button key={m.key} type="button" className="tag" aria-pressed={chosen.includes(m.key)} onClick={() => toggle(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="note">
        {chosen.length === 0
          ? 'Pick up to two. They help people find the right video for their mood.'
          : chosen.length === 1
            ? 'One more if you like.'
            : 'Thank you. Tap one again to change it.'}
      </p>
    </div>
  );
}
