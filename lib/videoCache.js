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
