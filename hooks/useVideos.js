import { useState, useEffect } from 'react';
import {
  loadVideos,
  saveVideos,
  loadRatings,
  saveRatings,
  loadIgnored,
  saveIgnored
} from '../utils/localStorage';

export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [ratings, setRatings] = useState({});
  const [ignoredIds, setIgnoredIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    try {
      const savedVideos = loadVideos();
      const savedRatings = loadRatings();
      const savedIgnored = loadIgnored();

      setVideos(savedVideos);
      setRatings(savedRatings);
      setIgnoredIds(savedIgnored);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const cleanupVideoFromLocalStorage = (videoId) => {
    console.log('Cleaning localStorage for video:', videoId);
  
    // All possible localStorage keys
    const keys = [
      'youtube_rating_videos',
      'youtube_rating_ratings', 
      'youtube_rating_ignored',
      'youtube_rating_favorites',
      'youtube_rating_cache',
      'youtube_rating_stats'
    ];
  
    keys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return;
  
        let data;
        try {
          data = JSON.parse(stored);
        } catch (parseError) {
          console.warn(`Invalid JSON in ${key}, removing:`, parseError);
          localStorage.removeItem(key);
          return;
        }
  
        let modified = false;
  
        if (Array.isArray(data)) {
          // Handle arrays (videos, ignored, favorites)
          const originalLength = data.length;
          const filtered = data.filter(item => {
            if (typeof item === 'string') {
              return item !== videoId;
            }
            if (typeof item === 'object' && item !== null) {
              return item.id !== videoId && item.videoId !== videoId;
            }
            return true;
          });
          
          if (filtered.length !== originalLength) {
            localStorage.setItem(key, JSON.stringify(filtered));
            modified = true;
          }
        } else if (typeof data === 'object' && data !== null) {
          // Handle objects (ratings)
          if (videoId in data) {
            delete data[videoId];
            localStorage.setItem(key, JSON.stringify(data));
            modified = true;
          }
        }
  
        if (modified) {
          console.log(`✅ Cleaned ${key} for video ${videoId}`);
        }
  
      } catch (error) {
        console.error(`Error cleaning ${key}:`, error);
      }
    });
  
    // Also save the updated ratings to localStorage
    saveRatings(ratings);
  };

  const removeRatingCompletely = async (videoId) => {
    try {
  
      // 1. Remove from database
      const response = await fetch('/api/rate', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove rating from database');
      }
  
      // 2. Remove from local ratings state
      setRatings(prev => {
        const newRatings = { ...prev };
        delete newRatings[videoId];
        return newRatings;
      });
  
      // 3. Remove from videos array completely
      setVideos(prev => prev.filter(video => video.id !== videoId));
  
      // 4. Remove from localStorage
      cleanupVideoFromLocalStorage(videoId);
  
      // 5. Update ignored set if needed
      setIgnoredIds(prev => {
        const newArray = prev.filter(id => id !== videoId);
        saveIgnored(newArray);
        return newArray;
      });
  
      console.log('Video completely removed from all storage');
      return true;
  
    } catch (error) {
      console.error('Failed to completely remove video:', error);
      throw error;
    }
  };

  const setRatingsFromDatabase = async (dbRatings) => {
    const ratingsObj = {};
    const missingVideoIds = [];
    
    try {
      const response = await fetch('/api/profile/' + userId + '/ratings', {
        credentials: 'include'
      });
      const data = await response.json();
  
      const dbRatings = Array.isArray(data.ratings) ? data.ratings : [];
      // Now safe to forEach:
      dbRatings.forEach(r => {
        ratingsObj[r.videoId] = { rating: r.score, ratedAt: r.ratedAt };
      });
      
      const existingVideo = videos.find(v => v.id === rating.videoId);
      if (!existingVideo) {
        missingVideoIds.push(rating.videoId);
      }
    });
    
    // Fetch missing video details from YouTube API
    if (missingVideoIds.length > 0) {
      try {
        console.log(`Fetching details for ${missingVideoIds.length} missing videos...`);
        const response = await fetch('/api/video-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoIds: missingVideoIds }),
        });
        
        if (response.ok) {
          const { videos: fetchedVideos } = await response.json();
          const updatedVideos = [...videos, ...fetchedVideos];
          setVideos(updatedVideos);
          saveVideos(updatedVideos);
          console.log(`Successfully fetched details for ${fetchedVideos.length} videos`);
        } else {
          console.error('Failed to fetch video details:', response.status);
        }
      } catch (error) {
        console.error('Failed to load ratings from DB:', error);
      }
    }
    
    setRatings(ratingsObj);
    localStorage.setItem('youtube_rating_ratings', JSON.stringify(ratingsObj));
  };
  
  // Also add the remove rating function
  const removeRating = async (videoId) => {
    try {
      const response = await fetch('/api/rate', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      // Remove from local state
      const updated = { ...ratings };
      delete updated[videoId];
      setRatings(updated);
      saveRatings(updated);

      setVideos(prev => prev.filter(v => v.id !== videoId));
      
      console.log('Rating removed successfully:', videoId);
    } catch (error) {
      console.error('Failed to remove rating:', error);
      alert('Failed to remove rating. Please try again.');
    }
  };




  // Add new videos (from import)
  const addVideos = (newVideos) => {
    try {
      const existingIds = new Set(videos.map(v => v.id));
      const unique = newVideos.filter(v => !existingIds.has(v.id));

      if (unique.length === 0) {
        return { success: true, added: 0 };
      }

      // Mark music videos
      const categorized = unique.map(video => ({
        ...video,
        isMusic: isMusicVideo(video)
      }));

      const updated = [...videos, ...categorized];
      const result = saveVideos(updated);

      if (result.success) {
        setVideos(updated);
        return { 
          success: true, 
          added: unique.length,
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

  const clearUnrated = () => {
    const remaining = videos.filter(v => ratings[v.id]);
    setVideos(remaining);
    saveVideos(remaining);
  };


  // Rate a video - store rating as number, not object
  const rateVideo = (videoId, rating) => {
    try {
      const updated = {
        ...ratings,
        [videoId]: {
          rating: Number(rating),
          ratedAt: new Date().toISOString()
        }
      };

      setRatings(updated);
      const result = saveRatings(updated);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save rating');
      }
    } catch (err) {
      console.error('Failed to save rating:', err);
      setError('Failed to save rating: ' + err.message);
    }
  };


  // Ignore a video
  const ignoreVideo = (videoId) => {
    try {
      const updated = Array.from(new Set([...ignoredIds, videoId]));
      setIgnoredIds(updated);

      const result = saveIgnored(updated);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save ignored list');
      }
    } catch (err) {
      console.error('Failed to ignore video:', err);
      setError('Failed to ignore video: ' + err.message);
    }
  };

  // Clear all data
  const clearAllData = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      setVideos([]);
      setRatings({});
      setIgnoredIds([]);
      setError(null);
    } catch (err) {
      setError('Failed to clear data');
    }
  };

  // Helper functions
  const isMusicVideo = (video) => {
    const text = `${video.title || ''} ${video.channel || ''}`.toLowerCase();
    return /music|song|album|artist|official music video|vevo|records|acoustic|cover|remix|soundtrack|live performance|concert/i.test(text);
  };

  const getMusicVideos = () => {
    return videos.filter(v => !ignoredIds.includes(v.id) && (v.isMusic || isMusicVideo(v)));
  };

  const getRegularVideos = () => {
    return videos.filter(v => !ignoredIds.includes(v.id) && !(v.isMusic || isMusicVideo(v)));
  };

  const getImportList = () => {
    return videos.filter(v => !ratings[v.id] && !ignoredIds.includes(v.id));
  };

  const getVideoStats = () => {
    const total = videos.length - ignoredIds.length;
    const ratedVideos = videos.filter(v => 
      ratings[v.id] && !ignoredIds.includes(v.id)
    );
    const ratedCount = ratedVideos.length;
  
    // Calculate average from actual rating values
    const ratingValues = ratedVideos.map(v => {
      const rating = ratings[v.id];
      return typeof rating === 'object' ? rating.rating : rating;
    }).filter(r => r != null);
    
    const avg = ratingValues.length > 0 
      ? Math.round((ratingValues.reduce((sum, r) => sum + Number(r), 0) / ratingValues.length) * 10) / 10 
      : 0;
  
    return {
      totalVideos: total,
      ratedVideos: ratedCount,
      unratedVideos: total - ratedCount,
      averageRating: avg,
      musicVideos: getMusicVideos().length,
      regularVideos: getRegularVideos().length,
      ignoredVideos: ignoredIds.length
    };
  };


  const updateLocalRating = (videoId, score) => {
    const updated = {
      ...ratings,
      [videoId]: { rating: Number(score), ratedAt: new Date().toISOString() }
    };
    setRatings(updated);
    saveRatings(updated);
  };

  return {
    videos,
    ratings,
    ignoredIds,
    loading,
    error,
    addVideos,
    rateVideo,
    removeRating,
    ignoreVideo,
    clearAllData,
    clearUnrated,
    updateLocalRating,
    getImportList,
    getMusicVideos,
    getRegularVideos,
    setRatingsFromDatabase,
    removeRatingCompletely,
    getVideoStats
  };
}
