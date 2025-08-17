// hooks/useVideos.js
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

  // Rehydrate ratings & ignored IDs
  useEffect(() => {
    setRatings(loadRatings());
    setIgnoredIds(loadIgnored());
  }, []);

  // Load full video list
  useEffect(() => {
    try {
      const all = loadVideos();
      setVideos(all);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new videos (e.g. after Takeout import)
  const addVideos = (newVideos) => {
    const existingIds = new Set(videos.map(v => v.id));
    const unique = newVideos.filter(v => !existingIds.has(v.id));
    if (unique.length === 0) return { success: true, added: 0 };

    const updated = [...videos, ...unique];
    const result = saveVideos(updated);
    if (result.success) {
      setVideos(updated);
      return { success: true, added: unique.length };
    } else {
      console.error('Failed to save videos:', result.error);
      return { success: false, error: result.error };
    }
  };

  // Rate a video
  const rateVideo = (videoId, rating) => {
    const next = { ...ratings, [videoId]: rating };
    setRatings(next);
    saveRatings(next);
  };

  // Ignore a video
  const ignoreVideo = (videoId) => {
    const next = Array.from(new Set([...ignoredIds, videoId]));
    setIgnoredIds(next);
    saveIgnored(next);
  };

  // Dev-only: clear all data
  const clearAllData = () => {
    localStorage.clear();
    setVideos([]);
    setRatings({});
    setIgnoredIds([]);
    setError(null);
  };

  // Helpers
  const isMusicVideo = (v) =>
    /music|song|album|artist|official music video|vevo|records/i.test(
      `${v.title || ''} ${v.channel || ''}`
    );

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
    addVideos,
    rateVideo,
    ignoreVideo,
    clearAllData,
    getImportList,
    getMusicVideos,
    getRegularVideos,
    getVideoStats
  };
}
