import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function QuickRate() {
  const router = useRouter();
  const { data: session } = useSession();
  const [video, setVideo] = useState(null);
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const { videoId, title, channel, thumbnail } = router.query;

  useEffect(() => {
    if (videoId && title) {
      try {
        setVideo({
          id: videoId,
          title: decodeURIComponent(title),
          channel: decodeURIComponent(channel || 'Unknown Channel'),
          thumbnail: thumbnail ? decodeURIComponent(thumbnail) : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        });
      } catch (decodeError) {
        // Fallback for encoding issues
        setVideo({
          id: videoId,
          title: title,
          channel: channel || 'Unknown Channel',
          thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        });
      }
    }
  }, [videoId, title, channel, thumbnail]);
  
  // Enhanced submit handler with better error handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!video || saving) return;
  
    setSaving(true);
    
    try {
      const response = await fetch('/api/rate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video: video, score: rating }),
      });
  
      if (response.ok) {
        alert('✅ Rating saved successfully!');
        // Try to close, fallback to redirect if it fails
        try {
          window.close();
        } catch (closeError) {
          // If window.close() fails, redirect to main app
          window.location.href = 'https://youtube-rating-app.vercel.app';
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || 'Failed to save rating');
      }
    } catch (error) {
      console.error('Failed to save rating:', error);
      alert('❌ Failed to save rating: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="quick-rate-container">
        <div className="auth-required">
          <h2>🔒 Sign In Required</h2>
          <p>Please sign in to your account first, then try the bookmarklet again.</p>
          <button onClick={() => window.close()} className="btn btn--outline">
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="quick-rate-container">
        <div className="invalid-video">
          <h2>❌ Invalid Video</h2>
          <p>No video information was provided.</p>
          <button onClick={() => window.close()} className="btn btn--outline">
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quick-rate-container">
      <div className="quick-rate-modal">
        <div className="quick-rate-header">
          <h2>🎬 Rate This Video</h2>
          <button 
            onClick={() => window.close()}
            className="close-btn"
          >
            ×
          </button>
        </div>
        
        <div className="video-info-quick">
          <img src={video.thumbnail} alt={video.title} className="video-thumb-quick" />
          <div className="video-details-quick">
            <h3>{video.title}</h3>
            <p>{video.channel}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="rating-form-quick">
          <div className="rating-input-section">
            <label>How would you rate this video?</label>
            <div className="rating-slider-container">
              <input
                type="range"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="rating-slider-colored"
                style={{
                  background: `linear-gradient(to right, 
                    #ff4444 0%, #ff4444 ${(rating-1) * 11.11}%, 
                    #ffaa00 ${(rating-1) * 11.11}%, #ffaa00 ${(rating-1) * 11.11 + 11.11}%,
                    #ffdd00 ${(rating-1) * 11.11 + 11.11}%, #ffdd00 ${(rating-1) * 11.11 + 22.22}%,
                    #88dd00 ${(rating-1) * 11.11 + 22.22}%, #88dd00 ${(rating-1) * 11.11 + 33.33}%,
                    #00dd00 ${(rating-1) * 11.11 + 33.33}%, #00dd00 100%)`
                }}
              />
              <div className="rating-display-colored" style={{
                color: rating <= 3 ? '#ff4444' : rating <= 5 ? '#ffaa00' : rating <= 7 ? '#ffdd00' : rating <= 8 ? '#88dd00' : '#00dd00'
              }}>
                <span className="rating-value-colored">{rating}</span>
                <span className="rating-max-colored">/10</span>
                <span className="rating-label-colored">
                  {rating <= 2 ? 'Terrible' : rating <= 4 ? 'Poor' : rating <= 6 ? 'Okay' : rating <= 8 ? 'Good' : 'Excellent'}
                </span>
              </div>
            </div>
            <div className="rating-scale-colored">
              <span>1-2: Terrible</span>
              <span>3-4: Poor</span>
              <span>5-6: Okay</span>
              <span>7-8: Good</span>
              <span>9-10: Excellent</span>
            </div>
          </div>
          
          <div className="form-actions-quick">
            <button 
              type="button" 
              onClick={() => window.close()}
              className="btn btn--outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Rating'}
            </button>
          </div>
        </form>
        
        <div className="quick-actions">
          <button 
            onClick={() => window.close()}
            className="btn btn--outline btn--sm"
          >
            🔗 Close & Back to YouTube
          </button>
        </div>
      </div>
    </div>
  );
}
