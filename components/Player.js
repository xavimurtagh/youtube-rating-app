import { useEffect, useRef, useState } from 'react';

let apiPromise = null;

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        reject(new Error('The YouTube player could not load'));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

/**
 * YouTube's official embedded player (privacy-enhanced domain), unmodified:
 * its controls, captions and ads all stay as YouTube serves them. We only
 * listen for the end of the video, so we can ask how it was — beside the
 * player, never on top of it.
 */
export default function Player({ id, title, onEnded }) {
  const wrapRef = useRef(null);
  const endedRef = useRef(onEnded);
  const [fallback, setFallback] = useState(false);

  endedRef.current = onEnded;

  useEffect(() => {
    let player;
    let cancelled = false;
    const wrap = wrapRef.current;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !wrap) return;
        const host = document.createElement('div');
        wrap.appendChild(host);
        player = new YT.Player(host, {
          videoId: id,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED && endedRef.current) endedRef.current();
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });

    return () => {
      cancelled = true;
      try {
        if (player) player.destroy();
      } catch {
        // The player may already be gone.
      }
      if (wrap) wrap.innerHTML = '';
    };
  }, [id]);

  if (fallback) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`}
        title={title || 'YouTube video player'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return <div ref={wrapRef} aria-label={title ? `Player: ${title}` : 'Video player'} />;
}
