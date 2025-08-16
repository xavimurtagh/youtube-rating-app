import { useState, useEffect } from 'react';
import { saveVideos, loadVideos, saveRating, loadRatings } from '../utils/localStorage';

export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load saved videos and ratings on component mount
    const savedVideos = loadVideos();
    const savedRatings = loadRatings();

    setVideos(savedVideos);
    setRatings(savedRatings);
  }, []);

  const addVideos = (newVideos) => {
    setLoading(true);
    try {
      // Merge new videos with existing ones, avoiding duplicates
      const existingIds = new Set(videos.map(v => v.id));
      const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.id));

      const updatedVideos = [...videos, ...uniqueNewVideos];
      setVideos(updatedVideos);
      saveVideos(updatedVideos);
      setError(null);
    } catch (err) {
      setError('Failed to add videos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const rateVideo = (videoId, rating) => {
    try {
      const success = saveRating(videoId, rating);
      if (success) {
        setRatings(prev => ({
          ...prev,
          [videoId]: { rating, ratedAt: new Date().toISOString() }
        }));
        setError(null);
        return true;
      }
    } catch (err) {
      setError('Failed to save rating');
      console.error(err);
    }
    return false;
  };

  const clearAllData = () => {
    setVideos([]);
    setRatings({});
    saveVideos([]);
    // Clear ratings storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('youtube_rating_ratings');
    }
  };

  const getVideoRating = (videoId) => {
    return ratings[videoId]?.rating || null;
  };

  const getRatedVideos = () => {
    return videos.filter(video => ratings[video.id]);
  };

  const getUnratedVideos = () => {
    return videos.filter(video => !ratings[video.id]);
  };

  const getVideoStats = () => {
    const ratedVideos = getRatedVideos();
    const totalRatings = ratedVideos.length;
    const averageRating = totalRatings > 0 
      ? ratedVideos.reduce((sum, video) => sum + ratings[video.id].rating, 0) / totalRatings 
      : 0;

    return {
      totalVideos: videos.length,
      totalRatings,
      unratedCount: videos.length - totalRatings,
      averageRating: Math.round(averageRating * 10) / 10
    };
  };

  return {
    videos,
    ratings,
    loading,
    error,
    addVideos,
    rateVideo,
    clearAllData,
    getVideoRating,
    getRatedVideos,
    getUnratedVideos,
    getVideoStats
  };
}
