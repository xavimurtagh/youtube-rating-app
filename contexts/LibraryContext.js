import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadVideos, saveVideos, loadRatings, saveRatings, loadIgnored, saveIgnored } from '../utils/localStorage';

/**
 * The user's library: videos they know about (imported history + anything
 * they've rated), their ratings, and the videos they've chosen to skip.
 *
 * Data model: when signed in, the database is the source of truth for
 * ratings. They're loaded once per session from /api/my-ratings and every
 * change goes through /api/rate first; localStorage is only a fast cache and
 * the staging area for imported Google Takeout history, which never leaves the
 * browser.
 */

const LibraryContext = createContext(null);

const LEGACY_KEY = 'matinee_legacy_ratings';
const MIGRATED_KEY = 'ratings_migrated';
const OWNER_KEY = 'matinee_owner';
const MAX_IMPORT = 5000;

const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== ''));
const videoPayload = (v) => compact({ id: v.id, title: v.title, channel: v.channel, thumbnail: v.thumbnail, category: v.category });

export function LibraryProvider({ children }) {
  const { data: session, status } = useSession();
  const [videos, setVideos] = useState([]);
  const [ratings, setRatings] = useState({});
  const [ignored, setIgnored] = useState([]);
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false);
  const [legacy, setLegacy] = useState(null);
  const [me, setMe] = useState(null);

  const videosRef = useRef(videos);
  const ratingsRef = useRef(ratings);
  videosRef.current = videos;
  ratingsRef.current = ratings;

  // Load what this browser already has.
  useEffect(() => {
    setVideos(loadVideos());
    setRatings(loadRatings());
    setIgnored(loadIgnored());
    setReady(true);
  }, []);

  const upsertVideos = useCallback((list) => {
    const prev = videosRef.current;
    const byId = new Map(prev.map((v) => [v.id, v]));
    let changed = false;
    for (const v of list) {
      if (!v || !v.id) continue;
      const merged = { ...byId.get(v.id), ...compact(v) };
      byId.set(v.id, merged);
      changed = true;
    }
    if (!changed) return;
    const next = Array.from(byId.values());
    videosRef.current = next;
    setVideos(next);
    saveVideos(next);
  }, []);

  const loadFromServer = useCallback(async () => {
    const res = await fetch('/api/my-ratings', { credentials: 'include' });
    if (!res.ok) throw new Error('Could not load your ratings');
    const rows = await res.json();
    const next = {};
    for (const r of rows) next[r.videoId] = { rating: r.score, ratedAt: r.ratedAt };
    upsertVideos(rows.filter((r) => r.video).map((r) => ({ id: r.videoId, ...r.video })));
    return { rows, next };
  }, [upsertVideos]);

  // Sync with the server once per sign-in.
  useEffect(() => {
    if (status !== 'authenticated' || !ready) return;
    let cancelled = false;

    (async () => {
      try {
        const email = session?.user?.email || '';
        const owner = localStorage.getItem(OWNER_KEY);
        const local = loadRatings();

        const [{ rows, next }, meRes] = await Promise.all([
          loadFromServer(),
          fetch('/api/me', { credentials: 'include' }),
        ]);
        if (cancelled) return;

        // Ratings that exist only in this browser (from before accounts, or a
        // failed save) can be offered for upload, but only to their owner.
        if (owner && owner !== email) {
          localStorage.removeItem(LEGACY_KEY);
        } else if (!localStorage.getItem(MIGRATED_KEY)) {
          const serverIds = new Set(rows.map((r) => r.videoId));
          const onlyLocal = Object.fromEntries(Object.entries(local).filter(([id]) => !serverIds.has(id)));
          if (Object.keys(onlyLocal).length > 0) {
            localStorage.setItem(LEGACY_KEY, JSON.stringify(onlyLocal));
            setLegacy(onlyLocal);
          } else {
            localStorage.setItem(MIGRATED_KEY, 'true');
          }
        }
        localStorage.setItem(OWNER_KEY, email);

        setRatings(next);
        saveRatings(next);
        setSynced(true);

        if (meRes.ok) {
          const profile = await meRes.json();
          if (!cancelled) setMe(profile);
        }
      } catch (error) {
        console.error('Library sync failed:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, ready, session?.user?.email, loadFromServer]);

  const rate = useCallback(
    async (video, score) => {
      if (status !== 'authenticated') throw new Error('Sign in to rate videos');
      const id = video.id;
      const previous = ratingsRef.current[id];
      const entry = { rating: score, ratedAt: new Date().toISOString() };

      setRatings((prev) => {
        const next = { ...prev, [id]: entry };
        saveRatings(next);
        return next;
      });
      upsertVideos([videoPayload(video)]);

      try {
        const res = await fetch('/api/rate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video: videoPayload(video), score }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Could not save your rating');
        }
      } catch (error) {
        setRatings((prev) => {
          const next = { ...prev };
          if (previous) next[id] = previous;
          else delete next[id];
          saveRatings(next);
          return next;
        });
        throw error;
      }
    },
    [status, upsertVideos]
  );

  const unrate = useCallback(async (id) => {
    const previous = ratingsRef.current[id];
    setRatings((prev) => {
      const next = { ...prev };
      delete next[id];
      saveRatings(next);
      return next;
    });
    try {
      const res = await fetch('/api/rate', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: id }),
      });
      if (!res.ok) throw new Error('Could not remove the rating');
    } catch (error) {
      if (previous) {
        setRatings((prev) => {
          const next = { ...prev, [id]: previous };
          saveRatings(next);
          return next;
        });
      }
      throw error;
    }
  }, []);

  const ignore = useCallback((ids, on = true) => {
    const list = Array.isArray(ids) ? ids : [ids];
    setIgnored((prev) => {
      const set = new Set(prev);
      for (const id of list) {
        if (on) set.add(id);
        else set.delete(id);
      }
      const next = Array.from(set);
      saveIgnored(next);
      return next;
    });
  }, []);

  /**
   * Import parsed Google Takeout history. Takeout lists every watch, so repeat
   * entries become a watch count — a strong hint about what someone loves.
   */
  const importHistory = useCallback((parsed) => {
    const counts = new Map();
    const latest = new Map();
    for (const v of parsed) {
      if (!v || !v.id) continue;
      counts.set(v.id, (counts.get(v.id) || 0) + 1);
      const seen = latest.get(v.id);
      if (!seen || (v.watchedAt && (!seen.watchedAt || v.watchedAt > seen.watchedAt))) latest.set(v.id, v);
    }

    const incoming = Array.from(latest.values())
      .sort((a, b) => String(b.watchedAt || '').localeCompare(String(a.watchedAt || '')))
      .slice(0, MAX_IMPORT);

    const byId = new Map(videosRef.current.map((v) => [v.id, v]));
    let added = 0;
    for (const v of incoming) {
      const current = byId.get(v.id);
      if (!current) added += 1;
      byId.set(v.id, {
        ...v,
        ...current,
        watchedAt: v.watchedAt || current?.watchedAt,
        watchCount: Math.max(counts.get(v.id) || 1, current?.watchCount || 0),
      });
    }

    const next = Array.from(byId.values());
    const result = saveVideos(next);
    const kept = result.truncated ? next.slice(0, result.saved) : next;
    videosRef.current = kept;
    setVideos(kept);
    return { added, unique: incoming.length, truncated: !!result.truncated, ok: result.success !== false };
  }, []);

  const migrateLegacy = useCallback(async () => {
    const entries = Object.entries(legacy || {});
    const byId = new Map(videosRef.current.map((v) => [v.id, v]));
    let saved = 0;
    for (const [id, value] of entries) {
      const score = typeof value === 'object' ? value.rating : value;
      const video = byId.get(id) || { id };
      try {
        const res = await fetch('/api/rate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video: videoPayload(video), score }),
        });
        if (res.ok) saved += 1;
      } catch {
        // Skip and carry on; the count reports what made it.
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    localStorage.setItem(MIGRATED_KEY, 'true');
    localStorage.removeItem(LEGACY_KEY);
    setLegacy(null);
    try {
      const { next } = await loadFromServer();
      setRatings(next);
      saveRatings(next);
    } catch {
      // The next sign-in will resync.
    }
    return { saved, total: entries.length };
  }, [legacy, loadFromServer]);

  const dismissLegacy = useCallback(() => {
    localStorage.setItem(MIGRATED_KEY, 'skipped');
    localStorage.removeItem(LEGACY_KEY);
    setLegacy(null);
  }, []);

  const clearLocal = useCallback(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Nothing else to do.
    }
    setVideos([]);
    setRatings({});
    setIgnored([]);
  }, []);

  const value = useMemo(() => {
    const videoById = new Map(videos.map((v) => [v.id, v]));
    const ignoredSet = new Set(ignored);
    const ratedList = Object.entries(ratings)
      .map(([id, entry]) => ({
        video: videoById.get(id) || { id },
        score: typeof entry === 'object' ? entry.rating : entry,
        ratedAt: typeof entry === 'object' ? entry.ratedAt : null,
      }))
      .sort((a, b) => String(b.ratedAt || '').localeCompare(String(a.ratedAt || '')));
    const history = videos.filter((v) => v.watchedAt && !ratings[v.id] && !ignoredSet.has(v.id));

    return {
      ready,
      synced,
      me,
      videos,
      videoById,
      ratings,
      ratedList,
      ratedCount: ratedList.length,
      history,
      ignored,
      ratingOf: (id) => {
        const entry = ratings[id];
        if (entry == null) return null;
        return typeof entry === 'object' ? entry.rating : entry;
      },
      rate,
      unrate,
      ignore,
      importHistory,
      upsertVideos,
      legacy,
      legacyCount: legacy ? Object.keys(legacy).length : 0,
      migrateLegacy,
      dismissLegacy,
      clearLocal,
    };
  }, [ready, synced, me, videos, ratings, ignored, rate, unrate, ignore, importHistory, upsertVideos, legacy, migrateLegacy, dismissLegacy, clearLocal]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
