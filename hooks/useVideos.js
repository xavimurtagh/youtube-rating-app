import { useState, useEffect } from 'react';
import { 
  loadVideos, 
  saveVideos, 
  loadRatings, 
  saveRating,
  getStorageInfo 
} from '../utils/localStorage';

export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    try {
      const savedVideos = loadVideos();
      const savedRatings = loadRatings();
      
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
      const result = saveVideos(updatedVideos);
      
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
      const result = saveRating(videoId, rating);
      if (result.success) {
        setRatings(prev => ({
          ...prev,
          [videoId]: {
            rating,
            ratedAt: new Date().toISOString()
          }
        }));
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
      
      const result = saveVideos(updatedVideos);
      if (result.success) {
        setVideos(updatedVideos);
      } else {
        throw new Error(result.error || 'Failed to update video');
      }
    } catch (err) {
      setError('Failed to ignore video: ' + err.message);
    }
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
    getMusicVideos,
    getRegularVideos
    // ... other existing functions
  };
}


 
