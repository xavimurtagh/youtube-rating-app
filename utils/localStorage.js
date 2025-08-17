// utils/localStorage.js
const STORAGE_KEYS = {
  VIDEOS: 'youtube_rating_videos',
  RATINGS: 'youtube_rating_ratings',
  IGNORED: 'youtube_rating_ignored',
  PRIVACY_PREFERENCES: 'youtube_rating_privacy',
  USER_STATS: 'youtube_rating_user_stats'
};

// SSR-safe storage functions
function safeLoad(key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return defaultValue;
  }
}

function safeSave(key, data) {
  if (typeof window === 'undefined') return { success: false };

  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded for', key);
      // Try to truncate arrays if too large
      if (Array.isArray(data) && data.length > 500) {
        const truncated = data.slice(-500);
        try {
          localStorage.setItem(key, JSON.stringify(truncated));
          return { success: true, truncated: true, saved: truncated.length };
        } catch (retryError) {
          return { success: false, error: 'Storage quota exceeded' };
        }
      }
    }
    console.error(`Failed to save ${key}:`, error);
    return { success: false, error: error.message };
  }
}

// Video storage
export function loadVideos() {
  return safeLoad(STORAGE_KEYS.VIDEOS, []);
}

export function saveVideos(videos) {
  return safeSave(STORAGE_KEYS.VIDEOS, videos);
}

// Rating storage - store ratings with proper structure
export function loadRatings() {
  return safeLoad(STORAGE_KEYS.RATINGS, {});
}

export function saveRatings(ratings) {
  return safeSave(STORAGE_KEYS.RATINGS, ratings);
}

// Ignored videos storage
export function loadIgnored() {
  return safeLoad(STORAGE_KEYS.IGNORED, []);
}

export function saveIgnored(ignoredIds) {
  return safeSave(STORAGE_KEYS.IGNORED, ignoredIds);
}

// Privacy preferences
export function loadPrivacyPreferences() {
  return safeLoad(STORAGE_KEYS.PRIVACY_PREFERENCES, {
    essential: true,
    analytics: false,
    personalization: false,
    marketing: false
  });
}

export function savePrivacyPreferences(preferences) {
  return safeSave(STORAGE_KEYS.PRIVACY_PREFERENCES, preferences);
}

// User stats
export function loadUserStats() {
  return safeLoad(STORAGE_KEYS.USER_STATS, {});
}

export function saveUserStats(stats) {
  return safeSave(STORAGE_KEYS.USER_STATS, stats);
}

// Clear all data
export function clearAllAppData() {
  if (typeof window === 'undefined') return { success: false };

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
