// Client-safe formatting helpers. Nothing here may import server-only code.

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];

/** Spell out small numbers, editorial-style ("twelve videos"). */
export function spelled(n, { capital = false } = {}) {
  const s = n >= 0 && n <= 20 ? WORDS[n] : String(n);
  return capital ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "a 9", "an 8", "an 8.4", "an 11" */
export function withArticle(value) {
  const n = Number(value);
  const s = String(value);
  const an = s.startsWith('8') || Math.round(n) === 11 || Math.round(n) === 18;
  return `${an ? 'an' : 'a'} ${s}`;
}

/** Candidate still URLs, best first. YouTube serves these for every video. */
export function stillUrls(id, size = 'md') {
  const base = `https://i.ytimg.com/vi/${id}`;
  if (size === 'lg') return [`${base}/maxresdefault.jpg`, `${base}/sddefault.jpg`, `${base}/hqdefault.jpg`];
  if (size === 'sm') return [`${base}/mqdefault.jpg`, `${base}/hqdefault.jpg`];
  return [`${base}/hqdefault.jpg`, `${base}/mqdefault.jpg`];
}

/** ISO 8601 duration (PT1H2M3S) → "1:02:03" / "8:31". */
export function formatDuration(iso) {
  if (!iso) return null;
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return null;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const s = String(Number(m[3] || 0)).padStart(2, '0');
  return h ? `${h}:${String(min).padStart(2, '0')}:${s}` : `${min}:${s}`;
}

/** "Friday 6 November 2026" — built by hand so no locale adds stray commas. */
export function dateline(date = new Date()) {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${weekday} ${date.getDate()} ${month} ${date.getFullYear()}`;
}

export function monthLabel(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function dayOfMonth(date) {
  return String(date.getDate()).padStart(2, '0');
}

export function yearOf(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
}

export function relativeTime(input) {
  const d = new Date(input);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (Number.isNaN(diff)) return '';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Ratings in the library are stored as { rating, ratedAt } (older data: a bare number). */
export function scoreOf(entry) {
  if (entry == null) return null;
  return typeof entry === 'object' ? entry.rating : entry;
}

/**
 * Turn a recommendation into one plain sentence: the "why" placard.
 * Uses the structured `because` field from the recommender when present.
 */
export function describeReason(rec, { short = false } = {}) {
  if (!rec) return '';
  const b = rec.because;

  if (b && b.kind === 'neighbour') {
    let s = `${b.name}, your ${b.similarity}% taste match, gave it ${withArticle(b.rating)}.`;
    const others = (rec.recommenderCount || 1) - 1;
    if (!short && others > 0) {
      s += ` ${spelled(others, { capital: true })} ${others === 1 ? 'other' : 'others'} like you rated it highly too.`;
    }
    return s;
  }
  // Scores are shown on the watch page, so these reasons stay qualitative.
  if (b && b.kind === 'category') return `You rate ${b.category} videos highly.`;
  if (b && b.kind === 'channel') return `You rate ${b.channel} highly.`;
  if ((b && b.kind === 'community') || rec.source === 'popular') return 'A favourite with people here.';
  return rec.reason || '';
}
