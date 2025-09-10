export function cleanVideoId(videoId) {
  console.log('cleanVideoId input:', videoId, 'type:', typeof videoId);
  
  // Handle null, undefined, or non-string inputs
  if (!videoId) {
    console.log('cleanVideoId: null/undefined input');
    return null;
  }
  
  if (typeof videoId !== 'string') {
    console.log('cleanVideoId: non-string input, converting');
    videoId = String(videoId);
  }
  
  let cleaned = videoId.trim();
  console.log('cleanVideoId after trim:', cleaned);
  
  // Handle empty string after trim
  if (!cleaned) {
    console.log('cleanVideoId: empty after trim');
    return null;
  }
  
  try {
    // Extract from URL if full URL provided
    const urlMatch = cleaned.match(/[?&]v=([^&]+)/);
    if (urlMatch && urlMatch) {
      cleaned = urlMatch;
      console.log('cleanVideoId extracted from URL:', cleaned);
    }
    
    // Remove common prefixes
    if (cleaned.startsWith('?v=')) {
      cleaned = cleaned.substring(3);
      console.log('cleanVideoId removed ?v= prefix:', cleaned);
    }
    if (cleaned.startsWith('v=')) {
      cleaned = cleaned.substring(2);
      console.log('cleanVideoId removed v= prefix:', cleaned);
    }
    
    // Split on various delimiters safely - one at a time
    if (cleaned.includes(',')) {
      cleaned = cleaned.split(',');
      console.log('cleanVideoId split on comma:', cleaned);
    }
    if (cleaned.includes('&')) {
      cleaned = cleaned.split('&');
      console.log('cleanVideoId split on &:', cleaned);
    }
    if (cleaned.includes('#')) {
      cleaned = cleaned.split('#');
      console.log('cleanVideoId split on #:', cleaned);
    }
    if (cleaned.includes('?')) {
      cleaned = cleaned.split('?');
      console.log('cleanVideoId split on ?:', cleaned);
    }
    if (cleaned.includes('/')) {
      cleaned = cleaned.split('/');
      console.log('cleanVideoId split on /:', cleaned);
    }
    
    // Final trim and validation
    cleaned = cleaned.trim();
    console.log('cleanVideoId final cleaned:', cleaned, 'length:', cleaned.length);
    
    // Validate YouTube video ID format (11 characters, alphanumeric + - _)
    const isValidLength = cleaned.length === 11;
    const isValidFormat = /^[a-zA-Z0-9_-]+$/.test(cleaned);
    
    console.log('cleanVideoId validation:', {
      length: cleaned.length,
      isValidLength,
      isValidFormat,
      regex: /^[a-zA-Z0-9_-]+$/.test(cleaned)
    });
    
    if (isValidLength && isValidFormat) {
      console.log('cleanVideoId SUCCESS:', cleaned);
      return cleaned;
    }
    
    // If validation fails, log and return null
    console.warn('cleanVideoId FAILED validation:', {
      input: videoId,
      cleaned: cleaned,
      length: cleaned.length,
      expectedLength: 11,
      format: /^[a-zA-Z0-9_-]+$/.test(cleaned)
    });
    return null;
    
  } catch (error) {
    console.error('cleanVideoId ERROR:', videoId, error);
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

// Fallback function that bypasses cleaning for development
export function directVideoId(videoId) {
  if (typeof videoId === 'string' && videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
    return videoId;
  }
  return null;
}
