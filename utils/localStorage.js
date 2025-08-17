// Enhanced localStorage utility with all required functions
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

function compressData(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('Data compression failed:', error);
    return JSON.stringify({ error: 'Data too large to store' });
  }
}

function decompressData(compressedData) {
  try {
    return JSON.parse(compressedData);
  } catch (error) {
    console.warn('Data decompression failed:', error);
    return null;
  }
}

export function saveToLocalStorage(key, data) {
  try {
    const serializedData = compressData(data);
    
    if (serializedData.length > CHUNK_SIZE * 5) { // 5MB limit
      console.warn('Data too large for localStorage, truncating...');
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
      try {
        const oldKeys = Object.keys(localStorage).filter(k => k.startsWith('youtube_rating_'));
        oldKeys.forEach(k => {
          if (k !== key) localStorage.removeItem(k);
        });
        
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
    
    const decompressed = decompressData(item);
    return decompressed !== null ? decompressed : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
}

export function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
    return false;
  }
}

export function getStorageInfo() {
  try {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length;
      }
    }
    return {
      used: Math.round(totalSize / 1024), // KB
      availableEstimate: Math.round((5 * 1024 * 1024 - totalSize) / 1024), // KB
      keys: Object.keys(localStorage).length
    };
  } catch (error) {
    return { used: 0, availableEstimate: 0, keys: 0 };
  }
}

// App-specific storage functions
export const STORAGE_KEYS = {
  VIDEOS: 'youtube_rating_videos',
  RATINGS: 'youtube_rating_ratings',
  IGNORED: 'youtube_rating_ignored',
  SETTINGS: 'youtube_rating_settings',
  PRIVACY_PREFERENCES: 'youtube_rating_privacy',
  USER_STATS: 'youtube_rating_user_stats'
};

// Save only ratings
export function saveRatings(ratings) {
  localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(ratings));
}

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

// Load only ratings
export function loadRatings() {
  const item = localStorage.getItem(STORAGE_KEYS.RATINGS);
  return item ? JSON.parse(item) : {};
}

export function saveUserStats(stats) {
  return saveToLocalStorage(STORAGE_KEYS.USER_STATS, stats);
}

export function loadUserStats() {
  return loadFromLocalStorage(STORAGE_KEYS.USER_STATS, {});
}

// Save only ignored IDs array
export function saveIgnored(ids) {
  localStorage.setItem(STORAGE_KEYS.IGNORED, JSON.stringify(ids));
}

// Load ignored IDs
export function loadIgnored() {
  const item = localStorage.getItem(STORAGE_KEYS.IGNORED);
  return item ? JSON.parse(item) : [];
}

// Privacy preferences functions - THESE WERE MISSING
export function savePrivacyPreferences(preferences) {
  return saveToLocalStorage(STORAGE_KEYS.PRIVACY_PREFERENCES, preferences);
}

export function loadPrivacyPreferences() {
  return loadFromLocalStorage(STORAGE_KEYS.PRIVACY_PREFERENCES, {
    essential: true,
    analytics: false,
    personalization: false,
    marketing: false
  });
}

export function saveSettings(settings) {
  return saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
}

export function loadSettings() {
  return loadFromLocalStorage(STORAGE_KEYS.SETTINGS, {});
}

export function clearAllAppData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to clear app data:', error);
    return { success: false, error: error.message };
  }
}
