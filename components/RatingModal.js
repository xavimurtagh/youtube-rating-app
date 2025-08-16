import { useState } from 'react';
import { escapeHtml } from '../utils/googleTakeout';

export default function RatingModal({ video, isOpen, onClose, onSave }) {
  const [rating, setRating] = useState(5);

  if (!isOpen || !video) return null;

  const handleSave = () => {
    onSave(video.id, rating);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Rate Video</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          <div className="video-info">
            <div className="video-details">
              <h4 dangerouslySetInnerHTML={{ __html: escapeHtml(video.title) }} />
              <p dangerouslySetInnerHTML={{ __html: escapeHtml(video.channel) }} />
              {video.watchedAt && (
                <p>Watched: {new Date(video.watchedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          <div className="rating-section">
            <label htmlFor="rating-slider">Rate this video (1-10):</label>
            <div className="rating-input">
              <input
                type="range"
                id="rating-slider"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="rating-slider"
              />
              <div className="rating-display">
                <span id="rating-value">{rating}</span>
                <span className="stars">{'★'.repeat(Math.ceil(rating / 2))}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn--secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn--primary">
            Save Rating
          </button>
        </div>
      </div>
    </div>
  );
}
