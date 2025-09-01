import { useState, useEffect } from 'react';
import { socialAPI } from '../utils/api';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function FavoritesSection({ ratings, videos, onRateVideo, onToggleFavorite }) {
  const { data: session } = useSession();
  const [customFavorites, setCustomFavorites] = useState(new Set());
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  useEffect(() => {
    if (session) {
      loadExistingFavorites();
    }
  }, [session]);

  const loadExistingFavorites = async () => {
    try {
      setLoadingFavorites(true);
      const response = await fetch('/api/favorites', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const favorites = await response.json();
        const favoriteIds = new Set(favorites.map(fav => fav.videoId));
        setCustomFavorites(favoriteIds);
        console.log('Loaded existing favorites:', favoriteIds);
      }
    } catch (error) {
      console.error('Failed to load existing favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

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

  // Get selected favorites (top 5 by default, customizable)
  const selectedFavorites = customFavorites.size > 0
  ? topRatedVideos.filter(video => customFavorites.has(video.id))
  : topRatedVideos.slice(0, 5);

  const handleToggleFavorite = async (video) => {
    try {
      if (customFavorites.has(video.id)) {
        // Remove favorite
        const response = await fetch(`/api/favorites/${video.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove favorite');
        }
        
        setCustomFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(video.id);
          return newSet;
        });
      } else {
        // Add favorite - Fix payload structure
        const payload = {
          videoId: video.id,  // Make sure this matches the API expectation
          videoTitle: video.title,
          videoChannel: video.channel,
          videoThumbnail: video.thumbnail,
          rating: typeof ratings[video.id] === 'object' 
            ? ratings[video.id].rating 
            : ratings[video.id]
        };
        
        console.log('Adding favorite with payload:', payload);
        
        const response = await fetch('/api/favorites', {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add favorite');
        }
        
        setCustomFavorites(prev => new Set([...prev, video.id]));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert(`Error: ${error.message}`);
    }
  };

  

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
        <div className="favorite-selection-section">
          <h3>💖 Select Your Favorites ({customFavorites.size}/5)</h3>
          <p>Choose up to 5 videos from your 9+ star ratings:</p>
          
          <div className="favorite-options-grid">
            {topRatedVideos.map(video => (
              <div 
                key={video.id}
                className={`favorite-option ${customFavorites.has(video.id) ? 'selected' : ''}`}
              >
                {video.thumbnail && (
                  <img src={video.thumbnail} alt={video.title} className="option-thumbnail" />
                )}
                <div className="option-details">
                  <h4>{video.title}</h4>
                  <p>{video.channel}</p>
                  <span className="option-rating">{video.rating}/10 ⭐</span>
                </div>
                <button 
                  onClick={() => handleToggleFavorite(video)}
                  className={`btn btn--sm ${customFavorites.has(video.id) ? 'btn--danger' : 'btn--primary'}`}
                  disabled={!customFavorites.has(video.id) && customFavorites.size >= 5}
                >
                  {customFavorites.has(video.id) ? 'Remove' : 'Add to Favorites'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-favorites-available">
          <p>💖 No Favorites Yet</p>
          <p>Rate videos 9 stars or higher to add them to your potential favorites!</p>
        </div>
      )}
    </div>
  );
}
