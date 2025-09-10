export function cleanVideoId(videoId) {
  if (!videoId) return null;
  
  // Handle different input formats
  let cleaned = videoId;
  
  // Extract from URL if full URL provided
  const urlMatch = cleaned.match(/[?&]v=([^&]+)/);
  if (urlMatch) {
    cleaned = urlMatch;
  }
  
  // Remove common prefixes
  if (cleaned.startsWith('?v=')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.startsWith('v=')) {
    cleaned = cleaned.substring(2);
  }
  
  // Split on various delimiters and take first part
  cleaned = cleaned.split(',')
                  .split('&')
                  .split('#')
                  .split('?')
                  .split('/')
                  .trim();
  
  // Validate YouTube video ID format (11 characters, alphanumeric + - _)
  if (cleaned.length === 11 && /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned;
  }
  
  console.warn('Invalid video ID format:', videoId, '→', cleaned);
  return null;
}

export function getYouTubeUrl(videoId) {
  const cleanId = cleanVideoId(videoId);
  return cleanId ? `https://www.youtube.com/watch?v=${cleanId}` : null;
}

export function getThumbnailUrl(videoId, quality = 'maxresdefault') {
  const cleanId = cleanVideoId(videoId);
  return cleanId ? `https://img.youtube.com/vi/${cleanId}/${quality}.jpg` : null;
}
