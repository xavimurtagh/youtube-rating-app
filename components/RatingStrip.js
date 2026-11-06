import { useRef, useState } from 'react';

const CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * The rating control: ten marks like the sprocket holes on a strip of film.
 * Keyboard: arrows step, Home/End jump, 1–9 and 0 (for 10) set directly.
 */
export default function RatingStrip({ value, onChange, size = 'md', label = 'Your rating', readOnly = false, showValue = true }) {
  const [hover, setHover] = useState(null);
  const groupRef = useRef(null);
  const shown = hover ?? value ?? null;

  const focusCell = (n) => groupRef.current?.querySelector(`[data-n="${n}"]`)?.focus();

  const onKeyDown = (e) => {
    if (readOnly || !onChange) return;
    const current = value || 0;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(10, current + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, current - 1 || 1);
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 10;
    else if (/^[0-9]$/.test(e.key)) next = e.key === '0' ? 10 : Number(e.key);
    if (next != null) {
      e.preventDefault();
      onChange(next);
      focusCell(next);
    }
  };

  const sizeClass = size === 'lg' ? ' rating--lg' : size === 'sm' ? ' rating--sm' : '';

  if (readOnly) {
    return (
      <div className={`rating${sizeClass}`} data-readonly="true">
        <span className="rating__cells" role="img" aria-label={value ? `Rated ${value} out of 10` : 'Not rated'}>
          {CELLS.map((n) => (
            <span key={n} className="rating__cell" data-on={value != null && n <= value} />
          ))}
        </span>
        {showValue && (
          <span className={`rating__value${value ? '' : ' rating__value--empty'}`} aria-hidden="true">
            {value || '–'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rating${sizeClass}`}>
      <div
        ref={groupRef}
        className="rating__cells"
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
      >
        {CELLS.map((n) => {
          const on = hover == null && value != null && n <= value;
          const preview = hover != null && n <= hover;
          const tabbable = value ? value === n : n === 1;
          return (
            <button
              key={n}
              type="button"
              className="rating__cell"
              data-n={n}
              data-on={on}
              data-preview={preview}
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} out of 10`}
              tabIndex={tabbable ? 0 : -1}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange && onChange(n)}
            />
          );
        })}
      </div>
      {showValue && (
        <span className={`rating__value${shown ? '' : ' rating__value--empty'}`} aria-hidden="true">
          {shown || '–'}
        </span>
      )}
    </div>
  );
}

/** Ten marks, filled to show progress (used for "ten ratings to unlock"). */
export function Meter({ value, of = 10, label }) {
  return (
    <span className="meter" role="img" aria-label={label || `${value} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} data-on={i < value} />
      ))}
    </span>
  );
}
