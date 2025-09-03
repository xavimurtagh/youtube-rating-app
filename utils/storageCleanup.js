// utils/storageCleanup.js
export const cleanupVideoFromStorage = (videoId) => {
  const keys = [
    'youtube_rating_videos',
    'youtube_rating_ratings',
    'youtube_rating_ignored', 
    'youtube_rating_favorites',
    'youtube_rating_stats',
    'youtube_rating_cache'
  ];

  console.log('Cleaning up video from all storage:', videoId);

  keys.forEach(key => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return;

      const data = JSON.parse(stored);
      let modified = false;

      if (Array.isArray(data)) {
        const filtered = data.filter(item => {
          // Handle different data structures
          if (typeof item === 'string') return item !== videoId;
          if (typeof item === 'object' && item.id) return item.id !== videoId;
          if (typeof item === 'object' && item.videoId) return item.videoId !== videoId;
          return true;
        });
        
        if (filtered.length !== data.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
          modified = true;
        }
      } else if (typeof data === 'object' && data !== null) {
        if (data[videoId]) {
          delete data[videoId];
          localStorage.setItem(key, JSON.stringify(data));
          modified = true;
        }
      }

      if (modified) {
        console.log(`Cleaned ${key}: removed video ${videoId}`);
      }
    } catch (error) {
      console.error(`Error cleaning ${key}:`, error);
    }
  });
};

// Export for use in components
export const clearAllVideoData = (videoId) => {
  cleanupVideoFromStorage(videoId);
  
  // Also clear any session storage
  try {
    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('youtube') || key.includes('rating')
    );
    
    sessionKeys.forEach(key => {
      const stored = sessionStorage.getItem(key);
      if (stored && stored.includes(videoId)) {
        sessionStorage.removeItem(key);
        console.log(`Cleared session storage: ${key}`);
      }
    });
  } catch (error) {
    console.error('Error clearing session storage:', error);
  }
};
