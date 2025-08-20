import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { socialAPI } from '../utils/api';

export default function SocialFeedSection() {
  const { data: session } = useSession();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      loadFeed();
    }
  }, [session]);

  const loadFeed = async () => {
    try {
      const feedData = await socialAPI.getFeed();
      setFeed(feedData);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>📱 Sign In for Social Feed</h2>
          <p>Sign in to see what your friends are rating and discover new videos!</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-state">
        <p>📱 Loading your social feed...</p>
      </div>
    );
  }

  return (
    <div className="social-feed-section">
      <div className="feed-header">
        <h2>📱 Friend Activity</h2>
        <p className="section-description">
          See what videos your friends are rating
        </p>
      </div>

      {feed.length > 0 ? (
        <div className="activity-feed">
          {feed.map(activity => (
            <div key={activity.id} className="activity-item">
              <img 
                src={activity.user.avatar || '/default-avatar.png'} 
                alt={activity.user.name}
                className="activity-avatar" 
              />
              <div className="activity-content">
                <p className="activity-text">
                  <strong>{activity.user.name}</strong> rated a video
                  <span className="activity-rating">{activity.data.score}/10</span>
                </p>
                <span className="activity-time">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="feed-placeholder">
          <div className="placeholder-content">
            <div className="feed-icon">📱</div>
            <h3>Your Feed is Empty</h3>
            <p>Follow friends to see their rating activity here!</p>
          </div>
        </div>
      )}
    </div>
  );
}
