import { useState, useEffect } from 'react';
import { socialAPI } from '../utils/api';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function FavoritesSection({ ratings, videos, onRateVideo, onToggleFavorite }) {
  const { data: session } = useSession();
  const [customFavorites, setCustomFavorites] = useState(new Set());

  // Get videos rated 9+ as potential favorites
  const topRatedVideos = videos
    .filter(video => {
      const rating = ratings[video.id];
      const ratingValue = typeof rating === 'object' ? rating.rating : rating;
      return ratingValue && ratingValue >= 9;
    })
    .map(video => ({
      ...video,
      rating: typeof ratings[video.id] === 'object' ? ratings[video.id].rating : ratings[video.id]
    }))
    .sort((a, b) => b.rating - a.rating);
  console.log('Sample topRatedVideos:', topRatedVideos.slice(0, 2))

  // Get selected favorites (top 5 by default, customizable)
  const selectedFavorites = topRatedVideos
    .filter(video => customFavorites.size === 0 || customFavorites.has(video.id))
    .slice(0, 5);

  const handleToggleFavorite = async (video) => {
    console.log('=== FRONTEND DEBUG ===')
    console.log('Video object:', video)
    console.log('Video.id:', video.id)
    console.log('Video type:', typeof video)
    console.log('==================')
    
    try {
      if (customFavorites.has(video.id)) {
        await socialAPI.removeFavorite(video.id)
        setCustomFavorites(prev => {
          const set = new Set(prev)
          set.delete(video.id)
          return set
        })
      } else {
        // Log the exact payload being sent
        const payload = {
          videoId: video.id,
          title: video.title,
          channel: video.channel,
          thumbnail: video.thumbnail,
        }
        console.log('Sending payload to addFavorite:', payload)
        
        await socialAPI.addFavorite(video)
        setCustomFavorites(prev => new Set(prev).add(video.id))
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      alert(error.message || 'Error updating favorite')
    }
  }

  

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>💖 Sign In to See Favorites</h2>
          <p>Sign in to view and manage your favorite videos!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-section">
      <div className="favorites-header">
        <h2>💖 Your Favorite Videos</h2>
        <p className="section-description">
          Select your top 5 favorites from videos rated 9+ stars
        </p>
      </div>

      {/* Top 5 Showcase */}
      {selectedFavorites.length > 0 && (
        <div className="top-favorites-showcase">
          <h3>⭐ Your Top 5 Favorites</h3>
          <div className="favorites-showcase">
            {selectedFavorites.map((video, index) => (
              <div key={video.id} className="favorite-showcase-item">
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.title} />
                ) : (
                  <div className="no-thumbnail">📺</div>
                )}
                <div className="favorite-overlay">
                  <span className="favorite-rank">#{index + 1}</span>
                  <span className="favorite-rating">{video.rating}/10</span>
                </div>
                <div className="favorite-info">
                  <h4 className="favorite-title">{video.title}</h4>
                  <p className="favorite-channel">{video.channel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorite Selection */}
      {topRatedVideos.length > 0 ? (
        <div className="favorite-selection">
          <h3>💖 Select Your Favorites ({customFavorites.size}/5)</h3>
          <p className="selection-hint">
            Choose up to 5 videos from your 9+ star ratings to showcase as favorites:
          </p>
          <div className="selectable-favorites">
            {topRatedVideos.map(video => (
              <div key={video.id} className={`favorite-option ${customFavorites.has(video.id) ? 'selected' : ''}`}>
                <div className="video-info">
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
                  )}
                  <div className="video-details">
                    <h4 className="video-title">{video.title}</h4>
                    <p className="video-channel">{video.channel}</p>
                    <span className="video-rating">{video.rating}/10 ⭐</span>
                  </div>
                </div>
                <button
                  className={`btn btn--sm ${customFavorites.has(video.id) ? 'btn--danger' : 'btn--primary'}`}
                  onClick={() => handleToggleFavorite(video)}
                  disabled={!customFavorites.has(video.id) && customFavorites.size >= 5}
                >
                  {customFavorites.has(video.id) ? '💔 Remove' : '💖 Add to Favorites'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="favorites-placeholder">
          <div className="placeholder-content">
            <div className="favorites-icon">💖</div>
            <h3>No Favorites Yet</h3>
            <p>Rate videos 9 stars or higher to add them to your potential favorites!</p>
          </div>
        </div>
      )}
    </div>
  );
}
