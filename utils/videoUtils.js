// Extract and validate a YouTube video ID from a raw value, which may be a
// bare ID, a full watch URL, a youtu.be/embed short URL, or a malformed value
// from older data.
export function cleanVideoId(videoId) {
  if (!videoId) return null;
  if (typeof videoId !== 'string') videoId = String(videoId);

  let cleaned = videoId.trim();
  if (!cleaned) return null;

  // Full watch URL: pull the `v=` query parameter.
  const urlMatch = cleaned.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    cleaned = urlMatch[1];
  } else {
    // Short forms: youtu.be/<id>, /embed/<id>, /v/<id>
    const shortMatch = cleaned.match(/(?:youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]+)/);
    if (shortMatch) cleaned = shortMatch[1];
  }

  // Strip any leftover prefix and keep only the first segment.
  cleaned = cleaned.replace(/^\??v=/, '');
  cleaned = cleaned.split(/[,&#?/]/)[0].trim();

  // A valid YouTube video ID is exactly 11 chars: letters, digits, - and _.
  return /^[a-zA-Z0-9_-]{11}$/.test(cleaned) ? cleaned : null;
}

export function getYouTubeUrl(videoId) {
  const cleanId = cleanVideoId(videoId);
  return cleanId ? `https://www.youtube.com/watch?v=${cleanId}` : null;
}

export function getThumbnailUrl(videoId, quality = 'maxresdefault') {
  const cleanId = cleanVideoId(videoId);
  return cleanId ? `https://img.youtube.com/vi/${cleanId}/${quality}.jpg` : null;
}

// Fallback that bypasses cleaning for already-valid IDs.
export function directVideoId(videoId) {
  if (typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return videoId;
  }
  return null;
}
