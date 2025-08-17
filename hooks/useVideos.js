import { useState, useEffect } from 'react';
import { saveVideos } from '../utils/localStorage';
import {
  loadVideos,
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

  useEffect(() => {
    setRatings(loadRatings());
    setIgnoredIds(loadIgnored());
  }, []);
  
  useEffect(() => {
    try {
      const allVideos = loadVideos();          // loadVideos instead of safeLoad
      setVideos(allVideos);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Rate a video
  const rateVideo = (videoId, rating) => {
    const newRatings = { ...ratings, [videoId]: rating };
    setRatings(newRatings);
    saveRatings(newRatings);
  };

  // Ignore a video
  const ignoreVideo = (videoId) => {
    const newIgnored = Array.from(new Set([...ignoredIds, videoId]));
    setIgnoredIds(newIgnored);
    saveIgnored(newIgnored);
  };

  // Clear all app data (dev only)
  const clearAllData = () => {
    localStorage.clear();
    setVideos([]);
    setRatings({});
    setIgnoredIds([]);
    setError(null);
  };

  // Helpers
  const isMusicVideo = (video) => {
    const text = `${video.title || ''} ${video.channel || ''}`.toLowerCase();
    return /music|song|album|artist|official music video|vevo|records/.test(text);
  };

  const result = saveVideos(updatedVideos);

  const getMusicVideos = () =>
    videos.filter(v => !ignoredIds.includes(v.id) && isMusicVideo(v));

  const getRegularVideos = () =>
    videos.filter(v => !ignoredIds.includes(v.id) && !isMusicVideo(v));

  const getImportList = () =>
    videos.filter(v => !ratings[v.id] && !ignoredIds.includes(v.id));

  const getVideoStats = () => {
    const total = videos.length - ignoredIds.length;
    const rated = Object.keys(ratings).length;
    const avg =
      rated > 0
        ? Math.round(
            Object.values(ratings).reduce((sum, r) => sum + r, 0) / rated * 10
          ) / 10
        : 0;
    return {
      totalVideos: total,
      ratedVideos: rated,
      unratedVideos: total - rated,
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
    rateVideo,
    ignoreVideo,
    clearAllData,
    getImportList,
    getMusicVideos,
    getRegularVideos,
    getVideoStats
  };
}
