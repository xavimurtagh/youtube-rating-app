// Utility functions for localStorage management
export function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

export function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
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

// App-specific storage functions
export const STORAGE_KEYS = {
  VIDEOS: 'youtube_rating_videos',
  RATINGS: 'youtube_rating_ratings',
  SETTINGS: 'youtube_rating_settings',
  PRIVACY_PREFERENCES: 'youtube_rating_privacy'
};

export function saveVideos(videos) {
  return saveToLocalStorage(STORAGE_KEYS.VIDEOS, videos);
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
