import React, { useState, useEffect } from 'react';

export default function SocialFeedSection() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSocialFeed();
  }, []);

  const cleanVideoId = (id) => {
    if (!id) return id;
    
    // Remove URL parameters and duplicates
    if (id.includes(',')) {
      id = id.split(',');
    }
    
    // Remove ?v= prefix if present
    if (id.startsWith('?v=')) {
      id = id.substring(3);
    }
    
    // Extract from URL if full URL provided
    const match = id.match(/[?&]v=([^&]+)/);
    if (match) {
      id = match;
    }
    
    return id;
  };

  const loadSocialFeed = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feed?limit=50'); // Limit to 50 activities
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to load social feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVideoTitle = (activity) => {
    // Try to get video title from activity data
    return activity.videoTitle || activity.video?.title || `Video ${activity.videoId.substring(0, 8)}...`;
  };

  const getVideoUrl = (videoId) => {
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  if (loading) {
    return <div className="loading">Loading social feed...</div>;
  }

  return (
    <div className="social-feed-section">
      <h2>🌐 Recent Activity</h2>
      
      <div className="activity-feed">
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <div key={activity.id || index} className="activity-item">
              <div className="activity-header">
                <div className="user-info">
                  <strong>{activity.user.name || 'Other User'}</strong>
                  <span className="activity-time">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="rating-badge">
                  ⭐ {activity.data.score}/10
                </div>
              </div>
              
              <div className="activity-content">
                <span>Rated: </span>
                <a 
                  href={getVideoUrl(cleanVideoId(activity.videoId))} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="video-link"
                >
                  {getVideoTitle(activity)}
                </a>
              </div>
              
              {activity.comment && (
                <div className="activity-comment">
                  "{activity.comment}"
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-activity">
            <p>No recent activity to show.</p>
          </div>
        )}
      </div>
    </div>
  );
}
