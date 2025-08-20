import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function AIRecommendationsSection({ videos, ratings, onRateVideo }) {
  const { data: session } = useSession();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Count user's ratings
  const userRatingCount = Object.keys(ratings).length;
  const minimumRatingsRequired = 10;

  useEffect(() => {
    if (session && userRatingCount >= minimumRatingsRequired) {
      loadRecommendations();
    }
  }, [session, userRatingCount]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recommendations');
      
      if (response.status === 400) {
        const errorData = await response.json();
        setError(errorData.error || 'Need at least 10 ratings for recommendations');
        setRecommendations([]);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setError('Failed to load recommendations. Please try again later.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };



  const handleRefreshRecommendations = () => {
    loadRecommendations();
  };

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>🤖 Sign In for AI Recommendations</h2>
          <p>Sign in to get personalized video recommendations based on your ratings!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-recommendations-section">
      <div className="recommendations-header">
        <h2>🤖 AI Recommendations</h2>
        <p className="section-description">
          Discover videos based on users with similar preferences
        </p>
      </div>

      {/* Disclaimer and Progress */}
      <div className="recommendations-disclaimer">
        <div className="disclaimer-card">
          <h3>📊 How It Works</h3>
          <p>
            Our AI analyzes users with similar rating patterns to yours and recommends 
            videos they enjoyed. The more you rate, the better the recommendations become!
          </p>
          
          <div className="rating-progress">
            <div className="progress-header">
              <span>Your Rating Progress</span>
              <span>{userRatingCount}/{minimumRatingsRequired} ratings</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${Math.min((userRatingCount / minimumRatingsRequired) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
          {error && (
            <div className="recommendations-error">
              <div className="error-content">
                <h3>🚧 Recommendations Unavailable</h3>
                <p>{error}</p>
                {error.includes('10 ratings') && (
                  <div className="rating-progress">
                    <p>You have {userRatingCount} ratings. Rate {10 - userRatingCount} more videos to unlock recommendations!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {userRatingCount < minimumRatingsRequired && (
            <div className="rating-requirement">
              <p className="requirement-text">
                ⚠️ <strong>Rate at least {minimumRatingsRequired} videos to unlock recommendations!</strong>
              </p>
              <p>You need {minimumRatingsRequired - userRatingCount} more ratings.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Content */}
      {userRatingCount >= minimumRatingsRequired ? (
        <div className="recommendations-content">
          <div className="recommendations-controls">
            <button 
              className="btn btn--primary"
              onClick={handleRefreshRecommendations}
              disabled={loading}
            >
              {loading ? '🔄 Generating...' : '🔄 Refresh Recommendations'}
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-animation">🤖</div>
              <p>AI is analyzing your preferences and finding similar users...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <h3>❌ Unable  to Load Recommendations</h3>
              <p>{error}</p>
              <button className="btn btn--outline" onClick={handleRefreshRecommendations}>
                Try Again
              </button>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="recommendations-results">
              <h3>🎯 Recommended for You</h3>
              <div className="recommendations-grid">
                {recommendations.map(rec => (
                  <div key={rec.video.id} className="recommendation-card">
                    <div className="recommendation-video">
                      <VideoList
                        videos={[rec.video]}
                        ratings={ratings}
                        onRateVideo={onRateVideo}
                        showLimit={null}
                      />
                    </div>
                    <div className="recommendation-meta">
                      <div className="match-score">
                        <span className="match-percentage">{rec.matchScore}% match</span>
                        <div className="match-bar">
                          <div 
                            className="match-fill" 
                            style={{ width: `${rec.matchScore}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="recommendation-reason">
                        <p><strong>Why this recommendation:</strong></p>
                        <p>{rec.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-recommendations">
              <div className="placeholder-content">
                <div className="recommendations-icon">🤖</div>
                <h3>No Recommendations Yet</h3>
                <p>
                  We need more data to generate good recommendations. 
                  Rate more videos or check back later as our user base grows!
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="recommendations-locked">
          <div className="locked-content">
            <div className="lock-icon">🔒</div>
            <h3>Recommendations Locked</h3>
            <p>Rate {minimumRatingsRequired - userRatingCount} more videos to unlock AI recommendations!</p>
            <div className="quick-actions">
              <a href="#search" className="btn btn--primary">
                🔍 Rate More Videos
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
