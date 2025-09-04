import { useState } from 'react';
import { escapeHtml } from '../utils/googleTakeout';

export default function RatingModal({ video, isOpen, onClose, onSave }) {
  const [rating, setRating] = useState(5);

  if (!isOpen || !video) return null;

  const handleSave = () => {
    onSave(video, rating);
    onClose();
    loadRatings();
    loadVideos();
  };

  const handleRatingUpdate = async (video, rating) => {
    try {
      const response = await fetch('/api/rate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video, score: rating })
      });
  
      if (!response.ok) {
        throw new Error('Failed to update rating');
      }
  
      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
  
      // Reload data instead of full page
      await loadRatings();
      await loadVideos();
  
      console.log('Rating updated and data refreshed');
  
    } catch (error) {
      console.error('Failed to update rating:', error);
      alert('❌ Failed to update rating. Please try again.');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const cleanVideoTitle = (title) => {
    if (!title) return 'Unknown Video';
    
    return title
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, '') // Remove non-standard characters
      .trim();
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
      className="modal-overlay modal" 
      onClick={handleOverlayClick}
    >
      <div className="modal-content" style={{ position: 'relative' }}>
  
        <div className="modal-header-fixed">
          <div className="modal-title-left">
            <h3 className="modal-main-title">Rate Video</h3>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn-fixed"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        {/* Video Info - Below Header */}
        <div className="video-info-section-fixed">
          <div className="video-thumbnail-section">
            {video.thumbnail && (
              <img src={video.thumbnail} alt={video.title} className="video-thumbnail-modal" />
            )}
          </div>
          <div className="video-details-section">
            <h4 className="video-title-modal">{cleanVideoTitle(video.title)}</h4>
            <p className="video-channel-modal">{video.channel}</p>
          </div>
        </div>
        
        <div className="rating-section-fixed">
          <div className="rating-question">
            <p>How would you rate this video?</p>

          
          <div className="rating-input">
            <input
              type="range"
              min="1"
              max="10"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              className="rating-slider"
              style={{ 
                background: `linear-gradient(to right, ${getRatingColor(rating)} 0%, ${getRatingColor(rating)} ${rating * 10}%, var(--color-secondary) ${rating * 10}%, var(--color-secondary) 100%)`
              }}
            />
            
            <div className="rating-display">
              <div className="rating-value-container">
                <span className="rating-value" style={{ color: getRatingColor(rating) }}>
                  {rating}
                </span>
                <span className="rating-max">/10</span>
              </div>
              <span className="rating-label" style={{ color: getRatingColor(rating) }}>
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
  
        <div className="modal-actions" style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end', marginTop: 'var(--space-24)' }}>
          <button onClick={onClose} className="btn btn--outline">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn--primary">
            Save Rating
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
