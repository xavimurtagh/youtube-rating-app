import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function FavoritesSection({ ratings, videos, onRateVideo }) {
  const { data: session } = useSession();
  const [favorites, setFavorites] = useState([]);

  // Get top 5 highest rated videos as favorites
  const topFavorites = videos
    .filter(video => ratings[video.id])
    .map(video => ({
      ...video,
      rating: typeof ratings[video.id] === 'object' 
        ? ratings[video.id].rating 
        : ratings[video.id]
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const allFavorites = videos
    .filter(video => {
      const rating = ratings[video.id];
      const ratingValue = typeof rating === 'object' ? rating.rating : rating;
      return ratingValue && ratingValue >= 8; // 8+ stars = favorite
    })
    .sort((a, b) => {
      const aRating = typeof ratings[a.id] === 'object' ? ratings[a.id].rating : ratings[a.id];
      const bRating = typeof ratings[b.id] === 'object' ? ratings[b.id].rating : ratings[b.id];
      return bRating - aRating;
    });

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
          Videos rated 8+ stars automatically become your favorites
        </p>
      </div>

      {/* Top 5 Showcase */}
      {topFavorites.length > 0 && (
        <div className="top-favorites-showcase">
          <h3>⭐ Top 5 Favorites</h3>
          <div className="favorites-showcase">
            {topFavorites.map((video, index) => (
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

      {/* All Favorites List */}
      {allFavorites.length > 0 ? (
        <div className="all-favorites">
          <h3>💖 All Your Favorites ({allFavorites.length})</h3>
          <VideoList
            videos={allFavorites}
            ratings={ratings}
            onRateVideo={onRateVideo}
            showLimit={null}
          />
        </div>
      ) : (
        <div className="favorites-placeholder">
          <div className="placeholder-content">
            <div className="favorites-icon">💖</div>
            <h3>No Favorites Yet</h3>
            <p>Rate videos 8 stars or higher to add them to your favorites!</p>
          </div>
        </div>
      )}
    </div>
  );
}
