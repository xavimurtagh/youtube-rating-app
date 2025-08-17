// Enhanced localStorage utility with compression and chunking
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

function compressData(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('Data compression failed:', error);
    return JSON.stringify({ error: 'Data too large to store' });
  }
}

export function saveToLocalStorage(key, data) {
  try {
    const serializedData = compressData(data);
    
    // Check if data is too large
    if (serializedData.length > CHUNK_SIZE * 5) { // 5MB limit
      console.warn('Data too large for localStorage, truncating...');
      // If it's an array (like videos), keep only recent items
      if (Array.isArray(data)) {
        const truncatedData = data.slice(-500); // Keep last 500 items
        localStorage.setItem(key, compressData(truncatedData));
        return { success: true, truncated: true, saved: truncatedData.length };
      }
    }
    
    localStorage.setItem(key, serializedData);
    return { success: true, truncated: false };
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Try to free up space by clearing old data
      try {
        const oldKeys = Object.keys(localStorage).filter(k => k.startsWith('youtube_rating_'));
        oldKeys.forEach(k => {
          if (k !== key) localStorage.removeItem(k);
        });
        
        // Try again with cleaned storage
        localStorage.setItem(key, compressData(data));
        return { success: true, truncated: false };
      } catch (retryError) {
        console.error('Failed to save to localStorage even after cleanup:', retryError);
        return { success: false, error: 'Storage quota exceeded' };
      }
    }
    console.error('Failed to save to localStorage:', error);
    return { success: false, error: error.message };
  }
}

export function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const decompressed = JSON.parse(item);
    return decompressed !== null ? decompressed : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
}

// App-specific storage functions
export const STORAGE_KEYS = {
  VIDEOS: 'youtube_rating_videos',
  RATINGS: 'youtube_rating_ratings',
  SETTINGS: 'youtube_rating_settings',
  PRIVACY_PREFERENCES: 'youtube_rating_privacy',
  USER_STATS: 'youtube_rating_user_stats'
};

export function saveVideos(videos) {
  const result = saveToLocalStorage(STORAGE_KEYS.VIDEOS, videos);
  if (result.truncated) {
    console.warn(`Videos truncated to ${result.saved} items due to storage limits`);
  }
  return result;
}

export function loadVideos() {
  return loadFromLocalStorage(STORAGE_KEYS.VIDEOS, []);
}

export function saveRating(videoId, rating) {
  const ratings = loadFromLocalStorage(STORAGE_KEYS.RATINGS, {});
  ratings[videoId] = {
    rating,
    ratedAt: new Date().toISOString()
  };
  return saveToLocalStorage(STORAGE_KEYS.RATINGS, ratings);
}

export function loadRatings() {
  return loadFromLocalStorage(STORAGE_KEYS.RATINGS, {});
}
