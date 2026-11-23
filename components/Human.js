import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';

/**
 * The browser side of "are you a person?" (Cloudflare Turnstile). Mostly
 * invisible: the widget only shows itself, in a small panel at the foot of
 * the screen, when Cloudflare wants an interaction. Without a site key it
 * does nothing, so development and screenshots never see it.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

const HumanContext = createContext(async () => true);

let scriptPromise = null;

function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('The check could not start')));
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('The check could not load'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function HumanProvider({ children }) {
  const holder = useRef(null);
  const [open, setOpen] = useState(false);

  /** Resolves true once a pass for `purpose` ("signup" or "rate") is set. */
  const check = useCallback(async (purpose) => {
    if (!SITE_KEY) return true;
    const turnstile = await loadTurnstile();
    const token = await new Promise((resolve, reject) => {
      const el = document.createElement('div');
      holder.current?.appendChild(el);
      let widget = null;
      const done = (fn, value) => {
        setOpen(false);
        try {
          turnstile.remove(widget);
        } catch {
          // Already gone.
        }
        el.remove();
        fn(value);
      };
      widget = turnstile.render(el, {
        sitekey: SITE_KEY,
        action: purpose,
        appearance: 'interaction-only',
        callback: (t) => done(resolve, t),
        'error-callback': () => done(reject, new Error('We couldn’t confirm that. Please try again.')),
        'expired-callback': () => done(reject, new Error('That check expired. Please try again.')),
        'before-interactive-callback': () => setOpen(true),
        'after-interactive-callback': () => setOpen(false),
      });
    });
    const res = await fetch('/api/human', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, purpose }),
    });
    if (!res.ok) throw new Error('We couldn’t confirm that. Please try again.');
    return true;
  }, []);

  return (
    <HumanContext.Provider value={check}>
      {children}
      {SITE_KEY && (
        <div className={`human${open ? ' human--open' : ''}`} aria-live="polite">
          {open && <p className="human__text">One quick check that you’re a person.</p>}
          <div ref={holder} />
        </div>
      )}
    </HumanContext.Provider>
  );
}

export function useHuman() {
  return useContext(HumanContext);
}

/**
 * Sign in with Google. A new account needs a pass from the check first; for
 * people who already have one it makes no difference, so a failed check never
 * stops the sign-in itself (the server decides).
 */
export function useSignIn() {
  const check = useHuman();
  return useCallback(
    async (options) => {
      try {
        await check('signup');
      } catch {
        // The server refuses a new account without a pass and says why.
      }
      return signIn('google', options);
    },
    [check]
  );
}
