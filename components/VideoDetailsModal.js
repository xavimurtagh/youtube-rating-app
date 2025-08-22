import { useState, useEffect } from 'react';

export default function VideoDetailsModal({ video, videoStats, onClose, onRate }) {
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [newRating, setNewRating] = useState(5);

  if (!video) return null;

  const handleRate = () => {
    onRate(video, newRating);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content video-details-modal">
        <div className="modal-header">
          <h2 className="modal-title">{video.title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="video-details-grid">
            {/* Thumbnail */}
            <div className="video-thumbnail-large">
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.title} />
              ) : (
                <div className="no-thumbnail-large">📺</div>
              )}
            </div>
            
            {/* Video Info */}
            <div className="video-info-details">
              <div className="detail-item">
                <strong>Channel:</strong> {video.channel}
              </div>
              
              {video.watchedAt && (
                <div className="detail-item">
                  <strong>Watched:</strong> {new Date(video.watchedAt).toLocaleDateString()}
                </div>
              )}
              
              <div className="detail-item">
                <strong>Video ID:</strong> {video.id}
              </div>
              
              {video.isMusic && (
                <div className="detail-item">
                  <span className="music-indicator">🎵 Music Video</span>
                </div>
              )}
            </div>
          </div>

          {/* Community Stats */}
          {videoStats && (
            <div className="community-stats">
              <h3>Community Ratings</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{videoStats.averageRating || 'N/A'}</div>
                  <div className="stat-label">Average Rating</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{videoStats.totalRatings}</div>
                  <div className="stat-label">Total Ratings</div>
                </div>
              </div>
              
              {/* Rating Distribution */}
              {videoStats.ratingDistribution && (
                <div className="rating-distribution">
                  <h4>Rating Distribution</h4>
                  <div className="distribution-bars">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(rating => {
                      const count = videoStats.ratingDistribution[rating] || 0;
                      const maxCount = Math.max(...Object.values(videoStats.ratingDistribution));
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={rating} className="distribution-row">
                          <span className="rating-label">{rating}★</span>
                          <div className="bar-container">
                            <div 
                              className="bar-fill" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="rating-count">({count})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {video.description && (
            <div className="video-description-full">
              <h4>Description</h4>
              <p>{video.description}</p>
            </div>
          )}
        </div>
        
        <div className="modal-actions">
          <button className="btn btn--primary" onClick={handleRate}>
            Rate This Video
          </button>
          <a 
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            Watch on YouTube
          </a>
          <button className="btn btn--outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
