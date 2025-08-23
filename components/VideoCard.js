import { useState, useEffect } from 'react';
import { decodeHtmlEntities } from '../utils/htmlUtils';

export default function VideoCard({ 
  video, 
  rating, 
  onRate, 
  onIgnore, 
  onRemoveRating,
  showIgnoreButton = false, 
  ignoreButtonText = 'Ignore'
}) {
  const [videoStats, setVideoStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Load video stats
  useEffect(() => {
    loadVideoStats();
  }, [video.id]);

  const loadVideoStats = async () => {
    if (!video?.id) return;
    
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/video/${video.id}/stats`);
      if (response.ok) {
        const stats = await response.json();
        setVideoStats(stats);
      } else {
        console.warn('Failed to load video stats:', response.status);
        setVideoStats({ totalRatings: 0, averageRating: null });
      }
    } catch (error) {
      console.error('Failed to load video stats:', error);
      setVideoStats({ totalRatings: 0, averageRating: null });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleRate = (e) => {
    e.stopPropagation();
    if (onRate) {
      onRate(video);
    }
  };

  const handleIgnore = (e) => {
    e.stopPropagation();
    if (onIgnore) {
      onIgnore(video.id);
    }
  };

  const handleRemoveRating = (e) => {
    e.stopPropagation();
    if (onRemoveRating && confirm('Are you sure you want to remove this rating?')) {
      onRemoveRating(video.id);
    }
  };

  // Detect if video is music
  const isMusic = video.isMusic || isMusicVideo(video);

  function isMusicVideo(v) {
    const text = `${v.title || ''} ${v.channel || ''}`.toLowerCase();
    return /music|song|album|artist|official music video|vevo|records/i.test(text);
  }

  // Get rating value - handle both old format (number) and new format (object)
  const getRatingValue = () => {
    if (!rating) return null;
    return typeof rating === 'object' ? rating.rating : rating;
  };

  const ratingValue = getRatingValue();

  return (
    <div className="video-card">
      {/* Improved thumbnail container */}
      <div className="video-thumbnail-container">
        {video.thumbnail ? (
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="video-thumbnail"
          />
        ) : (
          <div className="video-thumbnail-placeholder">
            📺
          </div>
        )}
        {isMusic && <div className="music-badge">🎵</div>}
      </div>

      <div className="video-content">
        <h3 className="video-title">{decodeHtmlEntities(video.title)}</h3>
        <p className="video-channel">{decodeHtmlEntities(video.channel)}</p>
        
        {video.watchedAt && (
          <p className="video-date">
            Watched: {new Date(video.watchedAt).toLocaleDateString()}
          </p>
        )}

        {/* Removed description section */}

        <div className="video-stats">
          {loadingStats ? (
            <span>Loading stats...</span>
          ) : videoStats ? (
            videoStats.totalRatings > 0 ? (
              <div className="stats-display">
                <span className="average-rating">
                  ⭐ {videoStats.averageRating}/10
                </span>
                <span className="rating-count">
                  ({videoStats.totalRatings} rating{videoStats.totalRatings !== 1 ? 's' : ''})
                </span>
              </div>
            ) : (
              <span className="no-stats">No ratings yet</span>
            )
          ) : (
            <span className="no-stats">No ratings yet</span>
          )}
        </div>

        {/* Personal Rating */}
        {ratingValue && (
          <div className="personal-rating">
            Your rating: {ratingValue}/10
          </div>
        )}

        <div className="video-actions">
          <button 
            className="btn btn--primary" 
            onClick={handleRate}
          >
            {ratingValue ? `Update Rating (${ratingValue}/10)` : 'Rate Video'}
          </button>
          
          {ratingValue && (
            <button 
              className="btn btn--outline btn--danger" 
              onClick={handleRemoveRating}
            >
              Remove Rating
            </button>
          )}
          
          {showIgnoreButton && (
            <button 
              className="btn btn--outline ignore-btn" 
              onClick={handleIgnore}
            >
              {ignoreButtonText}
            </button>
          )}

          <button 
            className="btn btn--outline" 
            onClick={(e) => e.stopPropagation()}
          >
            <a 
              href={`https://www.youtube.com/watch?v=${video.id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Watch on YouTube
            </a>
          </button>
        </div>
      </div>
    </div>
  );
}
