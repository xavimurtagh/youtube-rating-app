// A small per-tab cache of video metadata (and the reason a video was picked),
// so the watch page can show a title and its "why" without another API call.

const KEY = 'matinee:videos';
const FIELDS = ['id', 'title', 'channel', 'thumbnail', 'category', 'publishedAt', 'duration', 'why'];

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function rememberVideos(list) {
  if (typeof window === 'undefined' || !Array.isArray(list)) return;
  try {
    const cache = read();
    for (const v of list) {
      if (!v || !v.id) continue;
      const entry = { ...cache[v.id] };
      for (const f of FIELDS) if (v[f] != null && v[f] !== '') entry[f] = v[f];
      cache[v.id] = entry;
    }
    sessionStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage can be unavailable (private mode, quota). The cache is optional.
  }
}

export function recallVideo(id) {
  if (typeof window === 'undefined') return null;
  return read()[id] || null;
}

// Today's picks, in order, so the watch page can offer the next one.
const PROGRAMME_KEY = 'matinee:programme';

export function rememberProgramme(ids) {
  if (typeof window === 'undefined' || !Array.isArray(ids)) return;
  try {
    sessionStorage.setItem(PROGRAMME_KEY, JSON.stringify(ids.filter(Boolean)));
  } catch {
    // Optional, as above.
  }
}

/** The pick after `id` on today's list, with whatever we know about it. */
export function nextInProgramme(id) {
  if (typeof window === 'undefined') return null;
  try {
    const ids = JSON.parse(sessionStorage.getItem(PROGRAMME_KEY) || '[]');
    const i = ids.indexOf(id);
    if (i < 0 || i + 1 >= ids.length) return null;
    const nextId = ids[i + 1];
    return { id: nextId, position: i + 2, total: ids.length, ...read()[nextId] };
  } catch {
    return null;
  }
}
