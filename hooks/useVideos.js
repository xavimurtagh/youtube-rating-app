import { useState, useEffect } from 'react';

// SSR-safe localStorage functions
function safeLoadFromStorage(key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
}

function safeSaveToStorage(key, data) {
  if (typeof window === 'undefined') return { success: false };
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, truncating data...');
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
    return { success: false, error: error.message };
  }
}

export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data on mount (client-side only)
  useEffect(() => {
    try {
      const savedVideos = safeLoadFromStorage('youtube_rating_videos', []);
      const savedRatings = safeLoadFromStorage('youtube_rating_ratings', {});
      
      setVideos(savedVideos);
      setRatings(savedRatings);
    } catch (err) {
      setError('Failed to load data from storage');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to detect if a video is music
  const isMusicVideo = (video) => {
    const title = (video.title || '').toLowerCase();
    const channel = (video.channel || '').toLowerCase();
    const description = (video.description || '').toLowerCase();
    
    const musicKeywords = [
      'music', 'song', 'album', 'artist', 'band', 'official music video',
      'live performance', 'concert', 'acoustic', 'cover', 'remix',
      'soundtrack', 'single', 'ep', 'track', 'instrumental',
      'vevo', 'records'
    ];
    
    return musicKeywords.some(keyword => 
      title.includes(keyword) || channel.includes(keyword) || description.includes(keyword)
    );
  };

  const addVideos = (newVideos) => {
    try {
      const existingIds = new Set(videos.map(v => v.id));
      const uniqueNewVideos = newVideos.filter(video => !existingIds.has(video.id));
      
      if (uniqueNewVideos.length === 0) {
        return { success: true, added: 0 };
      }

      // Add music flag to videos
      const categorizedVideos = uniqueNewVideos.map(video => ({
        ...video,
        isMusic: isMusicVideo(video)
      }));

      const updatedVideos = [...videos, ...categorizedVideos];
      const result = safeSaveToStorage('youtube_rating_videos', updatedVideos);
      
      if (result.success) {
        setVideos(updatedVideos);
        return { 
          success: true, 
          added: uniqueNewVideos.length,
          truncated: result.truncated,
          saved: result.saved
        };
      } else {
        throw new Error(result.error || 'Failed to save videos');
      }
    } catch (err) {
      setError('Failed to add videos: ' + err.message);
      return { success: false, error: err.message };
    }
  };

  const rateVideo = (videoId, rating) => {
    try {
      const newRating = {
        rating,
        ratedAt: new Date().toISOString()
      };
      
      const updatedRatings = {
        ...ratings,
        [videoId]: newRating
      };
      
      const result = safeSaveToStorage('youtube_rating_ratings', updatedRatings);
      if (result.success) {
        setRatings(updatedRatings);
      } else {
        throw new Error(result.error || 'Failed to save rating');
      }
    } catch (err) {
      setError('Failed to save rating: ' + err.message);
    }
  };

  const ignoreVideo = (videoId, ignore = true) => {
    try {
      const updatedVideos = videos.map(video => 
        video.id === videoId 
          ? { ...video, ignored: ignore }
          : video
      );
      
      const result = safeSaveToStorage('youtube_rating_videos', updatedVideos);
      if (result.success) {
        setVideos(updatedVideos);
      } else {
        throw new Error(result.error || 'Failed to update video');
      }
    } catch (err) {
      setError('Failed to ignore video: ' + err.message);
    }
  };

  const clearAllData = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('youtube_rating_videos');
        localStorage.removeItem('youtube_rating_ratings');
        localStorage.removeItem('youtube_rating_privacy');
      }
      setVideos([]);
      setRatings({});
      setError(null);
    } catch (err) {
      setError('Failed to clear data');
    }
  };

  const getVideoStats = () => {
    const totalVideos = videos.length;
    const ratedVideos = Object.keys(ratings).length;
    const averageRating = ratedVideos > 0 
      ? Math.round((Object.values(ratings).reduce((sum, r) => sum + r.rating, 0) / ratedVideos) * 10) / 10 
      : 0;
    
    const musicVideos = videos.filter(v => v.isMusic || isMusicVideo(v)).length;
    const regularVideos = totalVideos - musicVideos;
    const ignoredVideos = videos.filter(v => v.ignored).length;

    return {
      totalVideos,
      ratedVideos,
      averageRating,
      musicVideos,
      regularVideos,
      ignoredVideos
    };
  };

  const getMusicVideos = () => {
    return videos.filter(video => video.isMusic || isMusicVideo(video));
  };

  const getRegularVideos = () => {
    return videos.filter(video => !(video.isMusic || isMusicVideo(video)));
  };

  return {
    videos,
    ratings,
    loading,
    error,
    addVideos,
    rateVideo,
    ignoreVideo,
    clearAllData,
    getVideoStats,
    getMusicVideos,
    getRegularVideos
  };
}
