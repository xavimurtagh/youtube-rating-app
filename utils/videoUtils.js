export function cleanVideoId(videoId) {
  // Handle null, undefined, or non-string inputs
  if (!videoId || typeof videoId !== 'string') {
    return null;
  }
  
  let cleaned = videoId.trim();
  
  // Handle empty string after trim
  if (!cleaned) {
    return null;
  }
  
  try {
    // Extract from URL if full URL provided
    const urlMatch = cleaned.match(/[?&]v=([^&]+)/);
    if (urlMatch && urlMatch) {
      cleaned = urlMatch;
    }
    
    // Remove common prefixes
    if (cleaned.startsWith('?v=')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.startsWith('v=')) {
      cleaned = cleaned.substring(2);
    }
    
    // Split on various delimiters safely - one at a time
    if (cleaned.includes(',')) {
      cleaned = cleaned.split(',');
    }
    if (cleaned.includes('&')) {
      cleaned = cleaned.split('&');
    }
    if (cleaned.includes('#')) {
      cleaned = cleaned.split('#');
    }
    if (cleaned.includes('?')) {
      cleaned = cleaned.split('?');
    }
    if (cleaned.includes('/')) {
      cleaned = cleaned.split('/');
    }
    
    // Final trim and validation
    cleaned = cleaned.trim();
    
    // Validate YouTube video ID format (11 characters, alphanumeric + - _)
    if (cleaned.length === 11 && /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
      return cleaned;
    }
    
    // If validation fails, log and return null
    console.warn('Invalid video ID format:', videoId, '→', cleaned);
    return null;
    
  } catch (error) {
    console.error('Error cleaning video ID:', videoId, error);
    return null;
  }
}

export function getYouTubeUrl(videoId) {
  const cleanId = cleanVideoId(videoId);
  return cleanId ? `https://www.youtube.com/watch?v=${cleanId}` : null;
}

export function getThumbnailUrl(videoId, quality = 'maxresdefault') {
  const cleanId = cleanVideoId(videoId);
  return cleanId ? `https://img.youtube.com/vi/${cleanId}/${quality}.jpg` : null;
}

// Alternative fallback function for cases where cleanVideoId fails
export function safeThumbnailUrl(videoId, quality = 'maxresdefault') {
  // First try cleaning
  const cleanId = cleanVideoId(videoId);
  if (cleanId) {
    return `https://img.youtube.com/vi/${cleanId}/${quality}.jpg`;
  }
  
  // If cleaning fails, try basic extraction for existing data
  if (typeof videoId === 'string' && videoId.length >= 11) {
    // Try to find an 11-character substring that looks like a video ID
    const match = videoId.match(/[a-zA-Z0-9_-]{11}/);
    if (match) {
      return `https://img.youtube.com/vi/${match}/${quality}.jpg`;
    }
  }
  
  // Return a placeholder or null
  return null;
}
