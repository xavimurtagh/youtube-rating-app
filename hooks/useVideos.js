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

  const setRatingsFromDatabase = (dbRatings) => {
    const ratingsObj = {};
    dbRatings.forEach(rating => {
      ratingsObj[rating.videoId] = {
        rating: rating.score,
        ratedAt: rating.ratedAt
      };
    });
    setRatings(ratingsObj);
    
    // Also update localStorage for offline access
    localStorage.setItem('youtube_rating_ratings', JSON.stringify(ratingsObj));
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
    const ratedCount = Object.keys(ratings).length;

    // Calculate average from actual rating values
    const ratingValues = Object.values(ratings).map(r => r.rating || r);
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

  return {
    videos,
    ratings,
    ignoredIds,
    loading,
    error,
    addVideos,
    rateVideo,
    ignoreVideo,
    clearAllData,
    getImportList,
    getMusicVideos,
    getRegularVideos,
    setRatingsFromDatabase,
    getVideoStats
  };
}
