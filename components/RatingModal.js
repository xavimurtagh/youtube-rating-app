import { useState } from 'react';
import { escapeHtml } from '../utils/googleTakeout';

export default function RatingModal({ video, isOpen, onClose, onSave }) {
  const [rating, setRating] = useState(5);

  if (!isOpen || !video) return null;

  const handleSave = () => {
    onSave(video, rating);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getRatingColor = (value) => {
    if (value <= 3) return '#ff4444'; // Red for bad
    if (value <= 6) return '#ffaa00'; // Orange for okay
    if (value <= 8) return '#44aa44'; // Green for good
    return '#0088ff'; // Blue for excellent
  };

  const getRatingLabel = (value) => {
    if (value <= 2) return 'Terrible';
    if (value <= 4) return 'Bad';
    if (value <= 6) return 'Okay';
    if (value <= 8) return 'Good';
    return 'Excellent';
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 1000 
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          maxWidth: '500px', 
          width: '90%', 
          position: 'relative' 
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          ×
        </button>

        <div className="modal-header">
          <h3>Rate Video</h3>
        </div>

        <div className="modal-body">
          <div className="video-info-modal">
            {video.thumbnail && (
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="video-thumbnail"
              />
            )}
            <div className="video-details">
              <h4 dangerouslySetInnerHTML={{ __html: escapeHtml(video.title) }} />
              <p dangerouslySetInnerHTML={{ __html: escapeHtml(video.channel) }} />
              {video.watchedAt && (
                <p>Watched: {new Date(video.watchedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          <div className="rating-section">
            <label htmlFor="rating-slider">How would you rate this video?</label>
            <div className="rating-input">
              <input
                type="range"
                id="rating-slider"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="rating-slider"
                style={{ 
                  background: `linear-gradient(to right, ${getRatingColor(rating)} 0%, ${getRatingColor(rating)} ${rating * 10}%, #ddd ${rating * 10}%, #ddd 100%)`
                }}
              />
              <div className="rating-display">
                <div className="rating-value-container">
                  <span 
                    className="rating-value" 
                    style={{ color: getRatingColor(rating) }}
                  >
                    {rating}
                  </span>
                  <span className="rating-max">/10</span>
                </div>
                <span 
                  className="rating-label"
                  style={{ color: getRatingColor(rating) }}
                >
                  {getRatingLabel(rating)}
                </span>
              </div>
            </div>

            <div className="rating-scale">
              <span>1-2: Terrible</span>
              <span>3-4: Bad</span>
              <span>5-6: Okay</span>
              <span>7-8: Good</span>
              <span>9-10: Excellent</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleSave} className="btn btn--primary">
            Save Rating
          </button>
          <button onClick={onClose} className="btn btn--outline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
